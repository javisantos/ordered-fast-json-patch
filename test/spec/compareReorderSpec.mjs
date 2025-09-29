import * as jsonpatch from '../../index.mjs';

describe('jsonpatch.compare with reorder detection', function () {
    describe('basic reorder detection', function () {
        it('should detect when object keys are reordered', function () {
            const tree1 = { c: 3, a: 1, b: 2 };
            const tree2 = { a: 1, b: 2, c: 3 };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            // Should generate a reorder patch when only key order changes
            expect(patches.length).toBe(1);
            expect(patches[0].op).toBe('reorder');
            expect(patches[0].path).toBe('');
            expect(patches[0].value).toEqual(['a', 'b', 'c']);
        });

        it('should not generate reorder patch when keys are in same order', function () {
            const tree1 = { a: 1, b: 2, c: 3 };
            const tree2 = { a: 1, b: 2, c: 3 };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            expect(patches.length).toBe(0);
        });

        it('should detect partial reordering', function () {
            const tree1 = { d: 4, c: 3, a: 1, b: 2 };
            const tree2 = { a: 1, b: 2, c: 3, d: 4 };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            expect(patches.length).toBe(1);
            expect(patches[0].op).toBe('reorder');
            expect(patches[0].path).toBe('');
            expect(patches[0].value).toEqual(['a', 'b', 'c', 'd']);
        });

        it('should handle nested object reordering', function () {
            const tree1 = {
                data: { c: 3, a: 1, b: 2 },
                other: 'unchanged'
            };
            const tree2 = {
                data: { a: 1, b: 2, c: 3 },
                other: 'unchanged'
            };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            expect(patches.length).toBe(1);
            expect(patches[0].op).toBe('reorder');
            expect(patches[0].path).toBe('/data');
            expect(patches[0].value).toEqual(['a', 'b', 'c']);
        });
    });

    describe('reorder detection with value changes', function () {
        it('should generate both value changes and reorder patches', function () {
            const tree1 = { c: 3, a: 1, b: 2 };
            const tree2 = { a: 1, b: 'changed', c: 3 };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            // Should have replace patch for value change and reorder patch
            expect(patches.length).toBe(2);
            
            const replacePatch = patches.find(p => p.op === 'replace');
            const reorderPatch = patches.find(p => p.op === 'reorder');
            
            expect(replacePatch).toBeDefined();
            expect(replacePatch.path).toBe('/b');
            expect(replacePatch.value).toBe('changed');
            
            expect(reorderPatch).toBeDefined();
            expect(reorderPatch.path).toBe('');
            expect(reorderPatch.value).toEqual(['a', 'b', 'c']);
        });

        it('should handle add operations with reordering', function () {
            const tree1 = { c: 3, a: 1 };
            const tree2 = { a: 1, b: 2, c: 3 };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            // Should have add patch and reorder patch
            expect(patches.length).toBe(2);
            
            const addPatch = patches.find(p => p.op === 'add');
            const reorderPatch = patches.find(p => p.op === 'reorder');
            
            expect(addPatch).toBeDefined();
            expect(addPatch.path).toBe('/b');
            expect(addPatch.value).toBe(2);
            
            expect(reorderPatch).toBeDefined();
            expect(reorderPatch.path).toBe('');
            expect(reorderPatch.value).toEqual(['a', 'b', 'c']);
        });

        it('should handle remove operations with reordering', function () {
            const tree1 = { c: 3, a: 1, b: 2, d: 4 };
            const tree2 = { a: 1, c: 3 };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            // Should have remove patches and reorder patch
            const removePatch = patches.find(p => p.op === 'remove' && p.path === '/b');
            const removePatch2 = patches.find(p => p.op === 'remove' && p.path === '/d');
            const reorderPatch = patches.find(p => p.op === 'reorder');
            
            expect(removePatch).toBeDefined();
            expect(removePatch2).toBeDefined();
            expect(reorderPatch).toBeDefined();
            expect(reorderPatch.path).toBe('');
            expect(reorderPatch.value).toEqual(['a', 'c']);
        });
    });

    describe('reorder detection edge cases', function () {
        it('should not generate reorder patch for arrays', function () {
            const tree1 = [3, 1, 2];
            const tree2 = [1, 2, 3];
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            // Should generate replace operations, not reorder
            expect(patches.every(p => p.op !== 'reorder')).toBe(true);
        });

        it('should handle empty objects', function () {
            const tree1 = {};
            const tree2 = {};
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            expect(patches.length).toBe(0);
        });

        it('should handle single key objects', function () {
            const tree1 = { a: 1 };
            const tree2 = { a: 1 };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            expect(patches.length).toBe(0);
        });

        it('should prioritize structural changes over reordering', function () {
            const tree1 = { c: 3, a: 1, b: 2 };
            const tree2 = [1, 2, 3]; // Complete type change
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            // Should generate replace patch for root, not reorder
            expect(patches.length).toBe(1);
            expect(patches[0].op).toBe('replace');
            expect(patches[0].path).toBe('');
        });
    });

    describe('deep nested reorder detection', function () {
        it('should detect reordering at multiple levels', function () {
            const tree1 = {
                level1: {
                    c: 3,
                    level2: { z: 26, a: 1 }
                }
            };
            const tree2 = {
                level1: {
                    level2: { a: 1, z: 26 },
                    c: 3
                }
            };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            expect(patches.length).toBe(2);
            
            const level1Reorder = patches.find(p => p.path === '/level1');
            const level2Reorder = patches.find(p => p.path === '/level1/level2');
            
            expect(level1Reorder).toBeDefined();
            expect(level1Reorder.op).toBe('reorder');
            expect(level1Reorder.value).toEqual(['level2', 'c']);
            
            expect(level2Reorder).toBeDefined();
            expect(level2Reorder.op).toBe('reorder');
            expect(level2Reorder.value).toEqual(['a', 'z']);
        });

        it('should handle mixed arrays and objects with reordering', function () {
            const tree1 = {
                items: [
                    { c: 3, a: 1, b: 2 },
                    { other: 'data' }
                ]
            };
            const tree2 = {
                items: [
                    { a: 1, b: 2, c: 3 }, // reordered
                    { other: 'data' }
                ]
            };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            expect(patches.length).toBe(1);
            expect(patches[0].op).toBe('reorder');
            expect(patches[0].path).toBe('/items/0');
            expect(patches[0].value).toEqual(['a', 'b', 'c']);
        });
    });

    describe('reorder detection performance considerations', function () {
        it('should only generate reorder patch when there are actual key order differences', function () {
            const tree1 = { a: 1, b: 2, c: 3, d: 4, e: 5 };
            const tree2 = { a: 1, b: 2, c: 3, d: 4, e: 5 };
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            expect(patches.length).toBe(0);
        });

        it('should efficiently detect minimal reorder changes', function () {
            const tree1 = { a: 1, b: 2, c: 3 };
            const tree2 = { a: 1, c: 3, b: 2 }; // Only b and c swapped
            
            const patches = jsonpatch.compare(tree1, tree2);
            
            expect(patches.length).toBe(1);
            expect(patches[0].op).toBe('reorder');
            expect(patches[0].value).toEqual(['a', 'c', 'b']);
        });
    });

    describe('integration with existing patch operations', function () {
        it('should work correctly when applying generated patches with reorder', function () {
            const tree1 = { c: 3, a: 1, b: 2 };
            const tree2 = { a: 1, b: 'modified', c: 3 };
            
            const patches = jsonpatch.compare(tree1, tree2);
            const result = jsonpatch.applyPatch(tree1, patches);
            
            expect(result.newDocument).toEqual(tree2);
            expect(Object.keys(result.newDocument)).toEqual(Object.keys(tree2));
        });

        it('should handle complex scenarios with multiple operation types', function () {
            const tree1 = { 
                f: 6, 
                d: 4, 
                a: 1, 
                b: 2, 
                c: 3 
            };
            const tree2 = { 
                a: 1, 
                b: 'changed', 
                c: 3, 
                e: 5  // added
                // f removed, d removed
            };
            
            const patches = jsonpatch.compare(tree1, tree2);
            const result = jsonpatch.applyPatch(tree1, patches);
            
            expect(result.newDocument).toEqual(tree2);
            expect(Object.keys(result.newDocument)).toEqual(['a', 'b', 'c', 'e']);
        });
    });
});

import * as jsonpatch from '../../index.mjs';

describe('jsonpatch.reorder operation', function () {
    describe('basic reorder functionality', function () {
        it('should reorder object keys according to specified order', function () {
            const obj = {
                c: 3,
                a: 1,
                b: 2
            };
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '',
                value: ['a', 'b', 'c']
            }).newDocument;

            const keys = Object.keys(result);
            expect(keys).toEqual(['a', 'b', 'c']);
            expect(result).toEqual({ a: 1, b: 2, c: 3 });
        });

        it('should reorder nested object keys', function () {
            const obj = {
                root: {
                    z: 26,
                    a: 1,
                    m: 13
                },
                other: 'value'
            };
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '/root',
                value: ['a', 'm', 'z']
            }).newDocument;

            const keys = Object.keys(result.root);
            expect(keys).toEqual(['a', 'm', 'z']);
            expect(result.root).toEqual({ a: 1, m: 13, z: 26 });
            expect(result.other).toBe('value');
        });

        it('should handle partial key ordering (missing keys go to end)', function () {
            const obj = {
                d: 4,
                a: 1,
                c: 3,
                b: 2
            };
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '',
                value: ['a', 'b']
            }).newDocument;

            const keys = Object.keys(result);
            expect(keys.slice(0, 2)).toEqual(['a', 'b']);
            expect(keys.slice(2).sort()).toEqual(['c', 'd']);
            expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
        });

        it('should handle ordering with extra keys in order array (non-existing keys ignored)', function () {
            const obj = {
                b: 2,
                a: 1
            };
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '',
                value: ['a', 'nonexistent', 'b', 'alsononexistent']
            }).newDocument;

            const keys = Object.keys(result);
            expect(keys).toEqual(['a', 'b']);
            expect(result).toEqual({ a: 1, b: 2 });
        });

        it('should handle empty order array', function () {
            const obj = {
                c: 3,
                a: 1,
                b: 2
            };
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '',
                value: []
            }).newDocument;

            // All keys should remain, order may vary but values should be preserved
            expect(Object.keys(result).length).toBe(3);
            expect(result).toEqual({ c: 3, a: 1, b: 2 });
        });
    });

    describe('edge cases', function () {
        it('should handle reordering empty object', function () {
            const obj = {};
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '',
                value: ['a', 'b']
            }).newDocument;

            expect(result).toEqual({});
        });

        it('should handle reordering object with single key', function () {
            const obj = { a: 1 };
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '',
                value: ['a']
            }).newDocument;

            expect(result).toEqual({ a: 1 });
            expect(Object.keys(result)).toEqual(['a']);
        });

        it('should preserve complex values during reordering', function () {
            const obj = {
                arr: [1, 2, 3],
                obj: { nested: true },
                str: 'hello',
                num: 42,
                bool: false,
                nil: null
            };
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '',
                value: ['bool', 'nil', 'num', 'str', 'obj', 'arr']
            }).newDocument;

            const keys = Object.keys(result);
            expect(keys).toEqual(['bool', 'nil', 'num', 'str', 'obj', 'arr']);
            expect(result).toEqual({
                bool: false,
                nil: null,
                num: 42,
                str: 'hello',
                obj: { nested: true },
                arr: [1, 2, 3]
            });
        });
    });

    describe('error cases', function () {
        it('should throw error when trying to reorder non-object', function () {
            const arr = [1, 2, 3];
            
            expect(function () {
                jsonpatch.applyOperation(arr, {
                    op: 'reorder',
                    path: '',
                    value: ['0', '1', '2']
                });
            }).toThrow();
        });

        it('should throw error when trying to reorder null', function () {
            const obj = { target: null };
            
            expect(function () {
                jsonpatch.applyOperation(obj, {
                    op: 'reorder',
                    path: '/target',
                    value: ['a', 'b']
                });
            }).toThrow();
        });

        it('should throw error when trying to reorder undefined', function () {
            const obj = {};
            
            expect(function () {
                jsonpatch.applyOperation(obj, {
                    op: 'reorder',
                    path: '/nonexistent',
                    value: ['a', 'b']
                });
            }).toThrow();
        });

        it('should throw error when value is not an array', function () {
            const obj = { a: 1, b: 2 };
            
            expect(function () {
                jsonpatch.applyOperation(obj, {
                    op: 'reorder',
                    path: '',
                    value: 'not-an-array'
                });
            }).toThrow();
        });
    });

    describe('with applyPatch', function () {
        it('should work with multiple reorder operations in a patch', function () {
            const obj = {
                first: { c: 3, a: 1, b: 2 },
                second: { z: 26, x: 24, y: 25 }
            };
            
            const patch = [
                { op: 'reorder', path: '/first', value: ['a', 'b', 'c'] },
                { op: 'reorder', path: '/second', value: ['x', 'y', 'z'] }
            ];
            
            const result = jsonpatch.applyPatch(obj, patch).newDocument;
            
            expect(Object.keys(result.first)).toEqual(['a', 'b', 'c']);
            expect(Object.keys(result.second)).toEqual(['x', 'y', 'z']);
        });

        it('should work with mixed operations in a patch', function () {
            const obj = {
                data: { c: 3, a: 1, b: 2 }
            };
            
            const patch = [
                { op: 'add', path: '/data/d', value: 4 },
                { op: 'reorder', path: '/data', value: ['a', 'b', 'c', 'd'] },
                { op: 'replace', path: '/data/b', value: 'two' }
            ];
            
            const result = jsonpatch.applyPatch(obj, patch).newDocument;
            
            expect(Object.keys(result.data)).toEqual(['a', 'b', 'c', 'd']);
            expect(result.data).toEqual({ a: 1, b: 'two', c: 3, d: 4 });
        });
    });

    describe('deep path reordering', function () {
        it('should reorder deeply nested objects', function () {
            const obj = {
                level1: {
                    level2: {
                        level3: {
                            gamma: 'γ',
                            alpha: 'α',
                            beta: 'β'
                        }
                    }
                }
            };
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '/level1/level2/level3',
                value: ['alpha', 'beta', 'gamma']
            }).newDocument;

            const keys = Object.keys(result.level1.level2.level3);
            expect(keys).toEqual(['alpha', 'beta', 'gamma']);
        });

        it('should handle array indices in paths correctly', function () {
            const obj = {
                items: [
                    { z: 3, a: 1, b: 2 },
                    { other: 'value' }
                ]
            };
            
            const result = jsonpatch.applyOperation(obj, {
                op: 'reorder',
                path: '/items/0',
                value: ['a', 'b', 'z']
            }).newDocument;

            const keys = Object.keys(result.items[0]);
            expect(keys).toEqual(['a', 'b', 'z']);
            expect(result.items[1]).toEqual({ other: 'value' });
        });
    });
});

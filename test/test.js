'use strict';
const flow = require('../lib/flow.js');
const sinon = require('sinon');
const assert = require('assert');
const chai = require('chai');
const expect = chai.expect;

describe('Flow', () => {
    describe('Serial', () => {
        it('should calls functions sequentially', () => {
            let spy1 = sinon.spy(next => {
                next(null);
            });
            let spy2 = sinon.spy((data, next) => {
                next(null, 'result');
            });
            flow.serial([spy1, spy2], (error, data) => {});
            assert(spy2.calledAfter(spy1));
        });

        it('should pass arguments to following function', () => {
            let spy = sinon.spy((data, next) => {
                next(null, ++data);
            });
            flow.serial([
                next => {
                    next(null, 0);
                },
                spy,
                spy,
                spy
            ], (error, data) => {});
            assert.equal(spy.args[0][0], 0);
            assert.equal(spy.args[1][0], 1);
            assert.equal(spy.args[2][0], 2);
        });

        it('should calls callback with result of the last function', () => {
            flow.serial([
                next => {
                    next(null, 'result1');
                },
                (data, next) => {
                    next(null, 'result2');
                }
            ], (error, results) => {
                expect(results).to.equal('result2');
            });
        });

        it('should calls callback with null if array of functions is empty', () => {
            flow.serial([],
            (error, result) => {
                expect(result).to.be.null;;
            });
        });

        it('should not execute function if previous failed', () => {
            let spy = sinon.spy(next => {
                next(true);
            });
            flow.serial([spy, spy, spy], (error, next) => {});
            expect(spy.calledOnce).to.be.true;
        });

        it('should calls callback with error if one of functions failed', () => {
            let func = next => {
                next(true);
            };
            flow.serial([func, func, func],
            (error, data) => {
                expect(error).to.be.true;
            });
        });
    });
    describe('Parallel', () => {
        it('should calls all functions once', () => {
            let spy1 = sinon.spy();
            let spy2 = sinon.spy();
            let spy3 = sinon.spy();
            flow.parallel([spy1, spy2, spy3], (error, data) => {});
            expect(spy1.calledOnce).to.be.true;
            expect(spy2.calledOnce).to.be.true;
            expect(spy3.calledOnce).to.be.true;
        });

        it('should calls all functions parallel if limit is more than number of functions', () => {
            let spy1 = sinon.spy();
            let spy2 = sinon.spy();
            let spy3 = sinon.spy();
            flow.parallel([spy1, spy2, spy3], 4, (error, data) => {});
            expect(spy1.calledOnce).to.be.true;
            expect(spy2.calledOnce).to.be.true;
            expect(spy3.calledOnce).to.be.true;
        });

        it('should calls callback with results of all functions in correct order', (done) => {
            flow.parallel([
                next => {
                    next(null, 0);
                },
                next => {
                    next(null, 1);
                },
                next => {
                    next(null, 2);
                }
            ], (error, results) => {
                expect(results).to.deep.equal([0, 1, 2]);
                done();
            });
        });

        it('should calls all functions if one of previous failed', () => {
            let spy = sinon.spy(next => {
                next(true);
            });
            flow.parallel([spy, spy, spy], (error, next) => {});
            expect(spy.calledThrice).to.be.true;
        });

        it('should calls callback with error if one of functions failed', (done) => {
            flow.parallel([
                next => {
                    next(true);
                },
                next => {
                    next(null);
                }
            ], (error, data) => {
                expect(error).to.be.true;
                done();
            });
        });

        it('should calls callback with [] if array of functions is empty', (done) => {
            flow.parallel([],
            (error, results) => {
                expect(results).to.be.an('Array');
                expect(results).to.be.empty;
                done();
            });
        });

        it('should calls callback with first error if there are multiple errors', (done) => {
            flow.parallel([
                next => {
                    next('error1');
                },
                next => {
                    next('error2');
                }
            ], (error, results) => {
                expect(error).to.be.equal('error1');
                done();
            });
        });

        it('should calls callback with [] as result if limit is less or equal zero', (done) => {
            flow.parallel([], 0,
            (error, results) => {
                expect(results).to.be.an('Array');
                expect(results).to.be.empty;
                done();
            });
        });

        it('should calls functions sync if limit is 1', (done) => {
            let calls = 0;
            flow.parallel([next => {
                setTimeout(function () {
                    calls++;
                    next(null, calls);
                }, 1000);
            }, next => {
                setTimeout(function () {
                    calls++;
                    next(null, calls);
                }, 0);
            }, next => {
                setTimeout(function () {
                    calls++;
                    next(null, calls);
                }, 0);
            }], 1,
            (error, results) => {
                expect(results).to.deep.equal([1,2,3]);
                done();
            });
        });
    });
    describe('Map', () => {
        it('should calls function with all arguments', () => {
            let spy = sinon.spy();
            flow.map([0,1,2], spy, (error, data) => {});
            expect(spy.calledWith(0)).to.be.true;
            expect(spy.calledWith(1)).to.be.true;
            expect(spy.calledWith(2)).to.be.true;
        });

        it('should calls callback with results of all functions in correct order', (done) => {
            let func = (arg, next) => {
                next(null, arg);
            };
            flow.map([0, 1, 2], func, (error, results) => {
                expect(results).to.deep.equal([0, 1, 2]);
                done();
            });
        });

        it('should calls callback with [] if array of arguments is empty', (done) => {
            flow.map([], (data, next) => {},
            (error, results) => {
                expect(results).to.be.an('Array');
                expect(results).to.be.empty;
                done();
            });
        });

        it('should calls callback with error if one of functions failed', () => {
            let spy = sinon.spy((arg, next) => {
                next(true);
            });
            let cbSpy = sinon.spy();
            flow.map([0], spy, cbSpy);
            assert(cbSpy.calledOnce);
            expect(cbSpy.args[0][0]).to.be.true;
        });

        it('should calls callback with first error if there are multiple errors', (done) => {
            let func = (arg, next) => {
                next('error' + arg, arg);
            };
            flow.map([0, 1, 2], func, (error, results) => {
                expect(error).to.be.equal('error0');
                done();
            });
        });
    });
    describe('MakeAsync', () => {
        it('should make sync functions async', (done) => {
            let asyncFunc = flow.makeAsync(arg => {
                return ++arg;
            });
            asyncFunc(0, (error, data) => {
                expect(data).to.be.equal(1);
                done();
            });
        });
    });
});

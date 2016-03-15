'use strict';
const flow = require('../lib/flow.js');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;

describe('Flow', () => {
    describe('Serial', () => {
        it('should calls functions sequentially', () => {
            let spy1 = sinon.spy(next => next(null));
            let spy2 = sinon.spy((data, next) => next(null, 'result'));
            flow.serial([spy1, spy2], (error, data) => {});
            expect(spy2.calledAfter(spy1)).to.be.true;
        });

        it('should pass arguments to following function', () => {
            let spy = sinon.spy((data, next) => next(null, ++data));
            flow.serial([
                next => next(null, 0),
                spy,
                spy,
                spy
            ], (error, data) => {
                expect(error).to.be.null;
            });
            expect(spy.firstCall.args[0]).to.equal(0);
            expect(spy.secondCall.args[0]).to.equal(1);
            expect(spy.thirdCall.args[0]).to.equal(2);
        });

        it('should calls callback with result of the last function', () => {
            flow.serial([
                next => next(null, 'result1'),
                (data, next) => next(null, 'result2')
            ], (error, results) => {
                expect(results).to.equal('result2');
            });
        });

        it('should calls callback with null if array of functions is empty', () => {
            flow.serial([], (error, result) => {
                expect(result).to.be.null;;
            });
        });

        it('should not execute function if previous failed', () => {
            let spy = sinon.spy((data, next) => next(true));
            flow.serial([
                next => next(null),
                spy,
                spy,
                spy
            ], (error, next) => {});
            expect(spy.calledOnce).to.be.true;
        });

        it('should calls callback with error if one of functions failed', (done) => {
            let spy = sinon.spy(next => next(true));
            flow.serial([
                next => next(true, 0),
                spy,
                spy
            ],
            (error, data) => {
                expect(data).to.deep.equal(0);
                expect(spy.called).to.be.false;
                expect(error).to.be.true;
                done();
            });
        });
    });
    describe('Parallel', () => {
        it('should calls all functions once', (done) => {
            let spy1 = sinon.spy(next => next(null));
            let spy2 = sinon.spy(next => next(null));
            let spy3 = sinon.spy(next => next(null));
            flow.parallel([spy1, spy2, spy3], (error, data) => {
                expect(spy1.calledOnce).to.be.true;
                expect(spy2.calledOnce).to.be.true;
                expect(spy3.calledOnce).to.be.true;
                done();
            });
        });

        it('should calls all functions parallel if limit is more than number of functions', () => {
            let spy = sinon.spy();
            flow.parallel([spy, spy, spy], 4, (error, data) => {});
            expect(spy.calledThrice).to.be.true;
        });

        it('should calls callback with results of all functions in correct order', (done) => {
            flow.parallel([
                next => next(null, 0),
                next => next(null, 1),
                next => next(null, 2)
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
                next => next(true),
                next => next(null)
            ], (error, data) => {
                expect(error).to.be.true;
                done();
            });
        });

        it('should ignore object in functions array if it is not function', (done) => {
            flow.parallel([
                next => next(null, 1),
                'string',
                next => next(null, 3)
            ], (error, data) => {
                expect(data).to.deep.equal([1,,3]);
                expect(error).to.be.null;
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
                next => next('error1'),
                next => next('error2')
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
            let asyncFunc = (next, time) => {
                setTimeout(() =>
                    next(null, ++calls), time);
            };
            flow.parallel([
                next => asyncFunc(next, 1000),
                next => asyncFunc(next, 0),
                next => asyncFunc(next, 0)
            ], 1,
            (error, results) => {
                expect(results).to.deep.equal([1,2,3]);
                done();
            });
        });

        it('should calls functions in correct order according limit ', (done) => {
            let calls = 0;
            let asyncFunc = (next, time) => {
                setTimeout(() =>
                    next(null, ++calls), time);
            };
            flow.parallel([
                next => asyncFunc(next, 1000),
                next => asyncFunc(next, 0),
                next => asyncFunc(next, 1000)
            ],
            (error, results) => {
                expect(results).to.deep.equal([2,1,3]);
                done();
            });
        });
    });
    describe('Map', () => {
        it('should calls function with all arguments', () => {
            let spy = sinon.spy();
            flow.map([0,1,2], spy, (error, data) => {});
            expect(spy.firstCall.args[0]).to.be.equal(0);
            expect(spy.secondCall.args[0]).to.be.equal(1);
            expect(spy.thirdCall.args[0]).to.be.equal(2);
        });

        it('should calls callback with results of all functions in correct order', (done) => {
            let spy = sinon.spy((arg, next) => next(null, arg));
            let callback = (error, results) => {
                expect(results).to.deep.equal([0, 1, 2]);
                done();
            };
            flow.map([0, 1, 2], spy, callback);
            expect(spy.firstCall.args[0]).to.be.equal(0);
            expect(spy.secondCall.args[0]).to.be.equal(1);
            expect(spy.thirdCall.args[0]).to.be.equal(2);
        });

        it('should calls callback with [] if array of arguments is empty', (done) => {
            let callback = (error, results) => {
                expect(results).to.be.an('Array');
                expect(results).to.be.empty;
                done();
            };
            flow.map([], (data, next) => {}, callback);
        });

        it('should calls callback with [] if calls with not a function', (done) => {
            let callback = (error, results) => {
                expect(results).to.be.an('Array');
                expect(results).to.be.empty;
                done();
            };
            flow.map([], 'not a function', callback);
        });

        it('should calls callback with error if one of functions failed', () => {
            let spy = sinon.spy((arg, next) => next(true));
            let cbSpy = sinon.spy();
            flow.map([0], spy, cbSpy);
            expect(cbSpy.calledOnce).to.be.true;
            expect(cbSpy.firstCall.args[0]).to.be.true;
        });

        it('should calls callback with first error if there are multiple errors', (done) => {
            let func = (arg, next) => next('error' + arg);
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

        it('should return null if calls with not a function', () => {
            let asyncFunc = flow.makeAsync('not function');
            expect(asyncFunc).to.be.null;
        });
    });
});

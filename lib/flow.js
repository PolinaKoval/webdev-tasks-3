'use strict';

/**
 *Запускает функции в массиве functionArray последовательно.
 *Результат функции передается в следующую.
 *Если любая из функций передает в колбэк ошибку,
 *то следующая не выполняется, а вызывается основной колбэк callback.
 *@param {Array} functionArray массив функций для выполнения
 *@param {Function} callback
 */
module.exports.serial = function (functionArray, callback) {
    if (functionArray.length === 0) {
        return callback(null, null);
    }
    var index = 0;
    function localCallback(error, data) {
        if (error) {
            return callback(error, data);
        }
        if (++index === functionArray.length) {
            return callback(error, data);
        }
        functionArray[index](data, localCallback);
    };
    functionArray[index](localCallback);
};

/**
 *запускает функции в массиве параллельно.
 *Результат собираются в массив, который передается в callback при завершении всех функций.
 *@param {Array} functionArray массив функций для выполнения
 *@param {Function} callback
 */
module.exports.parallel = function (functionArray, limit, callback) {
    if (arguments.length === 2) {
        callback = limit;
        limit = Infinity;
    }
    var running = 0;
    var error = null;
    if (functionArray.length === 0 || limit <= 0) {
        return callback(null, []);
    }
    var calls = 0;
    var i = 0;
    var resultArray = [];
    function callFunction() {
        while (running < limit && i < functionArray.length) {
            functionArray[i](function (i) {
                running++;
                return function (e, data) {
                    running--;
                    error = error || e;
                    if (!e) {
                        resultArray[i] = data;
                    }
                    if (++calls === functionArray.length) {
                        return callback(error, resultArray);
                    }
                    if (limit !== Infinity) {
                        callFunction();
                    }
                };
            }(i));
            i++;
        }
    }
    callFunction();
};

/**
 *запускает функцию func с каждым значением из argsArray параллельно.
 *Результат собираются в массив,
 *который передается в callback при завершении всех запусков.
 *@param {Array} argsArray массив значений для выполнения func
 *@param {Function} func функция для запуска
 *@param {Function} callback
 */
module.exports.map = function (argsArray, func, callback) {
    if (argsArray.length === 0) {
        return callback(null, []);
    }
    var calls = 0;
    var resultArray = [];
    var error = null;
    for (var i = 0; i < argsArray.length; i++) {
        func(argsArray[i], (function (i) {
            return function (e, data) {
                error = error || e;
                if (!e) {
                    resultArray[i] = data;
                }
                if (++calls === argsArray.length) {
                    return callback(error, resultArray);
                }
            };
        }(i)));
    }
};


/**
 *Метод превращает синхронную функцию func в асинхронную.
 *@param {Function} func функция
 *@returns {Function} асинхронная функция, принимающая callback последним аргументом
 */
module.exports.makeAsync = function (func) {
    return function () {
        var data = [];
        var last = arguments.length - 1;
        for (var i = 0; i < last; i++) {
            data.push(arguments[i]);
        };

        var callback = arguments[last];
        setTimeout(function () {
            var result;
            try {
                result = func.apply(null, data);
            } catch (e) {
                return callback(e);
            }
            return callback(null, result);
        }, 0);
    };
};



/* eslint-disable global-require */

describe('server-binance', () => {
  let config;

  let PubSubMock;
  let binanceMock;
  let loggerMock;
  let cacheMock;

  let mockGetGlobalConfiguration;

  let mockWebsocketCandlesClean;

  beforeEach(async () => {
    jest.clearAllMocks().resetModules();
    jest.useFakeTimers();
    jest.mock('config');

    const { PubSub, binance, logger, cache } = require('../helpers');

    PubSubMock = PubSub;
    binanceMock = binance;
    loggerMock = logger;
    cacheMock = cache;

    config = require('config');
  });

  describe('when the bot is running live mode', () => {
    describe('when websocket candles clean is null', () => {
      beforeEach(async () => {
        config.get = jest.fn(key => {
          switch (key) {
            case 'mode':
              return 'live';
            default:
              return `value-${key}`;
          }
        });

        mockGetGlobalConfiguration = jest.fn().mockResolvedValue({
          symbols: ['BTCUSDT']
        });

        jest.mock('../cronjob/trailingTradeHelper/configuration', () => ({
          getGlobalConfiguration: mockGetGlobalConfiguration
        }));

        mockWebsocketCandlesClean = jest.fn().mockResolvedValue(true);
        PubSubMock.subscribe = jest.fn().mockImplementation((_key, cb) => {
          cb('message', 'data');

          return () => mockWebsocketCandlesClean;
        });

        cacheMock.hset = jest.fn().mockResolvedValue(true);

        binanceMock.client.ws.candles = jest
          .fn()
          .mockImplementation((_symbols, _interval, cb) =>
            cb({
              symbol: 'BTCUSDT'
            })
          );

        const { runBinance } = require('../server-binance');
        await runBinance(loggerMock);
      });

      it('triggers PubSub.subscribe', () => {
        expect(PubSubMock.subscribe).toHaveBeenCalledWith(
          'trailing-trade-configuration-changed',
          expect.any(Function)
        );
      });

      it('triggers getGlobalConfiguration', () => {
        expect(mockGetGlobalConfiguration).toHaveBeenCalled();
      });

      it('does not trigger websocketCandlesClean', () => {
        expect(mockWebsocketCandlesClean).not.toHaveBeenCalled();
      });

      it('triggers cache.hset', () => {
        expect(cacheMock.hset).toHaveBeenCalledWith(
          'trailing-trade-symbols',
          'BTCUSDT-latest-candle',
          JSON.stringify({ symbol: 'BTCUSDT' })
        );
      });
    });

    describe('when websocket candles clean is not null', () => {
      beforeEach(async () => {
        config.get = jest.fn(key => {
          switch (key) {
            case 'mode':
              return 'live';
            default:
              return `value-${key}`;
          }
        });

        mockGetGlobalConfiguration = jest.fn().mockResolvedValue({
          symbols: ['BTCUSDT']
        });

        jest.mock('../cronjob/trailingTradeHelper/configuration', () => ({
          getGlobalConfiguration: mockGetGlobalConfiguration
        }));

        mockWebsocketCandlesClean = jest.fn().mockResolvedValue(true);

        cacheMock.hset = jest.fn().mockResolvedValue(true);

        binanceMock.client.ws.candles = jest
          .fn()
          .mockImplementation((_symbols, _interval, cb) => {
            cb({
              symbol: 'BTCUSDT'
            });

            return mockWebsocketCandlesClean;
          });

        PubSubMock.subscribe = jest.fn().mockImplementation((_key, cb) => {
          cb('message', 'data');
        });

        const { runBinance } = require('../server-binance');

        await runBinance(loggerMock);

        await runBinance(loggerMock);
      });

      it('triggers PubSub.subscribe', () => {
        expect(PubSubMock.subscribe).toHaveBeenCalledWith(
          'trailing-trade-configuration-changed',
          expect.any(Function)
        );
      });

      it('triggers getGlobalConfiguration', () => {
        expect(mockGetGlobalConfiguration).toHaveBeenCalled();
      });

      it('triggers websocketCandlesClean', () => {
        expect(mockWebsocketCandlesClean).toHaveBeenCalled();
      });

      it('triggers cache.hset', () => {
        expect(cacheMock.hset).toHaveBeenCalledWith(
          'trailing-trade-symbols',
          'BTCUSDT-latest-candle',
          JSON.stringify({ symbol: 'BTCUSDT' })
        );
      });
    });
  });

  describe('when the bot is running test mode', () => {
    beforeEach(async () => {
      config.get = jest.fn(key => {
        switch (key) {
          case 'mode':
            return 'test';
          default:
            return `value-${key}`;
        }
      });

      mockGetGlobalConfiguration = jest.fn().mockResolvedValue({
        symbols: ['BTCUSDT', 'ETHUSDT', 'LTCUSDT']
      });

      jest.mock('../cronjob/trailingTradeHelper/configuration', () => ({
        getGlobalConfiguration: mockGetGlobalConfiguration
      }));

      cacheMock.hset = jest.fn().mockResolvedValue(true);

      binanceMock.client.prices = jest.fn().mockResolvedValue({
        BTCUSDT: 30000,
        ETHUSDT: 1000,
        LTCUSDT: 120,
        XRPUSDT: 2
      });

      const { runBinance } = require('../server-binance');
      await runBinance(loggerMock);

      jest.advanceTimersByTime(1200);
    });

    it('triggers getGlobalConfiguration', () => {
      expect(mockGetGlobalConfiguration).toHaveBeenCalled();
    });

    it('triggers setTimeout', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    });

    [
      { symbol: 'BTCUSDT', expectedPrice: 30000 },
      { symbol: 'ETHUSDT', expectedPrice: 1000 },
      { symbol: 'LTCUSDT', expectedPrice: 120 }
    ].forEach(symbolInfo => {
      it(`triggers cache.hset for ${symbolInfo.symbol}`, () => {
        expect(cacheMock.hset).toHaveBeenCalledWith(
          'trailing-trade-symbols',
          `${symbolInfo.symbol}-latest-candle`,
          JSON.stringify({
            eventType: 'kline',
            symbol: symbolInfo.symbol,
            close: symbolInfo.expectedPrice
          })
        );
      });
    });
  });
});

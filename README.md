# Binance Trading Bot

[![GitHub version](https://img.shields.io/github/package-json/v/chrisleekr/binance-trading-bot)](https://github.com/chrisleekr/binance-trading-bot/releases)
[![Build](https://github.com/chrisleekr/binance-trading-bot/workflows/main/badge.svg)](https://github.com/chrisleekr/binance-trading-bot/actions?query=workflow%3Amain)
[![CodeCov](https://codecov.io/gh/chrisleekr/binance-trading-bot/branch/master/graph/badge.svg)](https://codecov.io/gh/chrisleekr/binance-trading-bot)
[![Docker pull](https://img.shields.io/docker/pulls/chrisleekr/binance-trading-bot)](https://hub.docker.com/r/chrisleekr/binance-trading-bot)
[![GitHub contributors](https://img.shields.io/github/contributors/chrisleekr/binance-trading-bot)](https://github.com/chrisleekr/binance-trading-bot/graphs/contributors)
[![MIT License](https://img.shields.io/github/license/chrisleekr/binance-trading-bot)](https://github.com/chrisleekr/binance-trading-bot/blob/master/LICENSE)

> Automated Binance trading bot with trailing buy/sell strategy

---

[![ko](https://img.shields.io/badge/lang-한국어-brightgreen.svg)](https://github.com/chrisleekr/binance-trading-bot/blob/master/README.ko.md)

This is a test project. I am just testing my code.

## Warnings

**I cannot guarantee whether you can make money or not.**

**So use it at your own risk! I have no responsibility for any loss or hardship
incurred directly or indirectly by using this code. Read
[disclaimer](#disclaimer) before using this code.**

**Before updating the bot, make sure to record the last buy price in the note.
It may lose the configuration or last buy price records.**

## Breaking Changes

As I introduce a new feature, I did lots of refactoring the code including
settings. If the bot version is lower than the version `0.0.57`, then the update
will cause lost your settings and the last buy price records. You must write
down settings and the last buy price records and re-configure after the upgrade.

If experiences any issue, simply delete all docker volumes/images and re-launch
the bot.

## How it works

### Trailing Buy/Sell Bot

This bot is using the concept of trailing buy/sell order which allows following
the price fall/rise.

- The bot can monitor multiple symbols. Each symbol will be monitored per
  second.
- The bot is only tested and working with USDT pair in the FIAT market such as
  BTCUSDT, ETHUSDT. You can add more FIAT symbols like BUSD, AUD from the
  frontend. However, I didn't test in the live server. So use with your own
  risk.
- The bot is using MongoDB to provide a persistence database. However, it does
  not use the latest MongoDB to support Raspberry Pi 32bit. Used MongoDB version
  is 3.2.20, which is provided by
  [apcheamitru](https://hub.docker.com/r/apcheamitru/arm32v7-mongo).

#### Buy Signal

The bot will continuously monitor the lowest value for the period of the
candles. Once the current price reaches the lowest price, then the bot will
place a STOP-LOSS-LIMIT order to buy. If the current price continuously falls,
then the bot will cancel the previous order and re-place the new STOP-LOSS-LIMIT
order with the new price.

- The bot will not place a buy order if has enough coin (typically over $10
  worth) to sell when reaches the trigger price for selling.

##### Buy Scenario

Let say, if the buy configurations are set as below:

- Maximum purchase amount: $50
- Trigger percentage: 1.005 (0.5%)
- Stop price percentage: 1.01 (1.0%)
- Limit price percentage: 1.011 (1.1%)

And the market is as below:

- Current price: $101
- Lowest price: $100
- Trigger price: $100.5

Then the bot will not place an order because the trigger price ($100.5) is less
than the current price ($101).

In the next tick, the market changes as below:

- Current price: $100
- Lowest price: $100
- Trigger price: $100.5

The bot will place new STOP-LOSS-LIMIT order for buying because the current
price ($100) is less than the trigger price ($100.5). For the simple
calculation, I do not take an account for the commission. In real trading, the
quantity may be different. The new buy order will be placed as below:

- Stop price: $100 \* 1.01 = $101
- Limit price: $100 \* 1.011 = $101.1
- Quantity: 0.49

In the next tick, the market changes as below:

- Current price: $99
- Current limit price: $99 \* 1.011 = 100.089
- Open order stop price: $101

As the open order's stop price ($101) is higher than the current limit price
($100.089), the bot will cancel the open order and place new STOP-LOSS-LIMIT
order as below:

- Stop price: $99 \* 1.01 = $99.99
- Limit price: $99 \* 1.011 = $100.089
- Quantity: 0.49

If the price continuously falls, then the new buy order will be placed with the
new price.

And if the market changes as below in the next tick:

- Current price: $100

Then the current price reaches the stop price ($99.99); hence, the order will be
executed with the limit price ($100.089).

### Sell Signal

If there is enough balance for selling and the last buy price is recorded in the
bot, then the bot will start monitoring the sell signal. Once the current price
reaches the trigger price, then the bot will place a STOP-LOSS-LIMIT order to
sell. If the current price continuously rises, then the bot will cancel the
previous order and re-place the new STOP-LOSS-LIMIT order with the new price.

- If the coin is worth less than typically $10 (minimum notional value), then
  the bot will remove the last buy price because Binance does not allow to place
  an order of less than $10.
- If the bot does not have a record for the last buy price, the bot will not
  sell the coin.

#### Sell Scenario

Let say, if the sell configurations are set as below:

- Trigger percentage: 1.05 (5.0%)
- Stop price percentage: 0.98 (-2.0%)
- Limit price percentage: 0.979 (-2.1%)

And the market is as below:

- Coin owned: 0.5
- Current price: $100
- Last buy price: $100
- Trigger price: $100 \* 1.05 = $105

Then the bot will not place an order because the trigger price ($105) is higher
than the current price ($100).

If the price is continuously falling, then the bot will keep monitoring until
the price reaches the trigger price.

In the next tick, the market changes as below:

- Current price: $105
- Trigger price: $105

The bot will place new STOP-LOSS-LIMIT order for selling because the current
price ($105) is higher or equal than the trigger price ($105). For the simple
calculation, I do not take an account for the commission. In real trading, the
quantity may be different. The new sell order will be placed as below:

- Stop price: $105 \* 0.98 = $102.9
- Limit price: $105 \* 0.979 = $102.795
- Quantity: 0.5

In the next tick, the market changes as below:

- Current price: $106
- Current limit price: $103.774
- Open order stop price: $102.29

As the open order's stop price ($102.29) is less than the current limit price
($103.774), the bot will cancel the open order and place new STOP-LOSS-LIMIT
order as below:

- Stop price: $106 \* 0.98 = $103.88
- Limit price: $106 \* 0.979 = $103.774
- Quantity: 0.5

If the price continuously rises, then the new sell order will be placed with the
new price.

And if the market changes as below in the next tick:

- Current price: $103

The the current price reaches the stop price ($103.88); hence, the order will be
executed with the limit price ($103.774).

### Frontend + WebSocket

React.js based frontend communicating via Web Socket:

- List monitoring coins with buy/sell signals/open orders
- View account balances
- Manage global/symbol settings
- Delete caches that are not monitored
- Link to public URL
- Support Add to Home Screen

## Environment Parameters

Use environment parameters to adjust parameters. Check
`/config/custom-environment-variables.json` to see list of available environment
parameters.

Or use the frontend to adjust configurations after launching the application.

## How to use

1. Create `.env` file based on `.env.dist`.

   | Environment Key                | Description                                                               | Sample Value                                                                                        |
   | ------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
   | BINANCE_LIVE_API_KEY           | Binance API key for live                                                  | (from [Binance](https://binance.zendesk.com/hc/en-us/articles/360002502072-How-to-create-API))      |
   | BINANCE_LIVE_SECRET_KEY        | Binance API secret for live                                               | (from [Binance](https://binance.zendesk.com/hc/en-us/articles/360002502072-How-to-create-API))      |
   | BINANCE_TEST_API_KEY           | Binance API key for test                                                  | (from [Binance Spot Test Network](https://testnet.binance.vision/))                                 |
   | BINANCE_TEST_SECRET_KEY        | Binance API secret for test                                               | (from [Binance Spot Test Network](https://testnet.binance.vision/))                                 |
   | BINANCE_SLACK_ENABLED          | Slack enable/disable                                                      | true                                                                                                |
   | BINANCE_SLACK_WEBHOOK_URL      | Slack webhook URL                                                         | (from [Slack](https://slack.com/intl/en-au/help/articles/115005265063-Incoming-webhooks-for-Slack)) |
   | BINANCE_SLACK_CHANNEL          | Slack channel                                                             | "#binance"                                                                                          |
   | BINANCE_SLACK_USERNAME         | Slack username                                                            | Chris                                                                                               |
   | BINANCE_LOCAL_TUNNEL_ENABLED   | Enable/Disable [local tunnel](https://github.com/localtunnel/localtunnel) | true                                                                                                |
   | BINANCE_LOCAL_TUNNEL_SUBDOMAIN | Local tunnel public URL subdomain                                         | binance                                                                                             |

2. Check `docker-compose.yml` for `BINANCE_MODE` environment parameter

3. Launch/Update the bot with docker-compose

   Pull latest code first:

   ```bash
   git pull
   ```

   If want production mode, then use the latest build image from DockerHub:

   ```bash
   docker-compose -f docker-compose.server.yml pull
   docker-compose -f docker-compose.server.yml up -d
   ```

   Or if using Raspberry Pi 4 32bit, must build again for Raspberry Pi:

   ```bash
   npm run docker:build
   docker-compose -f docker-compose.rpi.yml up -d
   ```

   Or if want development mode, then run below commands:

   ```bash
   docker-compose up -d
   ```

4. Open browser `http://0.0.0.0:8080` to see the frontend

   - When launching the application, it will notify public URL to the Slack.
   - If you have any issue with the bot, you can check the log to find out what
     happened with the bot. Please take a look
     [Troubleshooting](https://github.com/chrisleekr/binance-trading-bot/wiki/Troubleshooting)

### Install via Stackfile

1. In [Portainer](https://www.portainer.io/) create new Stack

2. Copy content of `docker-stack.yml` or upload the file

3. Set environment keys for `binance-bot` in the `docker-stack.yml`

4. Launch and open browser `http://0.0.0.0:8080` to see the frontend

## Screenshots

| Frontend Mobile                                                                                                          | Setting                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| ![Frontend Mobile](https://user-images.githubusercontent.com/5715919/111430413-72e8f280-874e-11eb-9870-6603282fde8e.png) | ![Setting](https://user-images.githubusercontent.com/5715919/111027223-f2bb4800-8442-11eb-9f5d-95f77298f4c0.png) |

| Frontend Desktop                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------- |
| ![Frontend Desktop](https://user-images.githubusercontent.com/5715919/111430212-28677600-874e-11eb-9314-1d617e25fd06.png) |

### Sample Trade

| Chart                                                                                                          | Buy Orders                                                                                                          | Sell Orders                                                                                                          |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| ![Chart](https://user-images.githubusercontent.com/5715919/111027391-192db300-8444-11eb-8df4-91c98d0c835b.png) | ![Buy Orders](https://user-images.githubusercontent.com/5715919/111027403-36628180-8444-11eb-91dc-f3cdabc5a79e.png) | ![Sell Orders](https://user-images.githubusercontent.com/5715919/111027411-4b3f1500-8444-11eb-8525-37f02a63de25.png) |

### Last 30 days trade

| Trade History                                                                                                          | PNL Analysis                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ![Trade History](https://user-images.githubusercontent.com/5715919/111430291-4503ae00-874e-11eb-9e68-aefa4bca19b2.png) | ![Profit & Loss](https://user-images.githubusercontent.com/5715919/111430313-4df47f80-874e-11eb-9f3d-e85cf3027d74.png) |

## Changes & Todo

Please refer
[CHANGELOG.md](https://github.com/chrisleekr/binance-trading-bot/blob/master/CHANGELOG.md)
to view the past changes.

- [ ] Update the bot to monitor all coins every second -
      [#52](https://github.com/chrisleekr/binance-trading-bot/issues/52)
- [ ] Display release version to the frontend -
      [#59](https://github.com/chrisleekr/binance-trading-bot/issues/59)
- [ ] Improve frontend & settings UI -
      [#93](https://github.com/chrisleekr/binance-trading-bot/issues/93)
      [#85](https://github.com/chrisleekr/binance-trading-bot/issues/85)
- [ ] Support all symbols -
      [#104](https://github.com/chrisleekr/binance-trading-bot/issues/104)
- [ ] Improve sell strategy with conditional stop price percentage based on the
      profit percentage -
      [#94](https://github.com/chrisleekr/binance-trading-bot/issues/94)
- [ ] Add sudden drop buy strategy -
      [#67](https://github.com/chrisleekr/binance-trading-bot/issues/67)
- [ ] Improve buy strategy with restricting purchase if the price is close to
      ATH - [#82](https://github.com/chrisleekr/binance-trading-bot/issues/82)
- [ ] Add minimum required order amount -
      [#84](https://github.com/chrisleekr/binance-trading-bot/issues/84)
- [ ] Add manual buy/sell
      feature -[#100](https://github.com/chrisleekr/binance-trading-bot/issues/100)
- [ ] Add stop loss feature -
      [#99](https://github.com/chrisleekr/binance-trading-bot/issues/99)
- [ ] Support multilingual frontend -
      [#56](https://github.com/chrisleekr/binance-trading-bot/issues/56)
- [ ] Reset global configuration to initial configuration -
      [#97](https://github.com/chrisleekr/binance-trading-bot/issues/97)
- [ ] Add frontend option to disable sorting
- [ ] Allow browser notification in the frontend
- [ ] Secure frontend with the password
- [ ] Develop simple setup screen for secrets

## Donations

If you find this project helpful, feel free to make a small
[donation](https://github.com/chrisleekr/binance-trading-bot/blob/master/DONATIONS.md)
to the developer.

## Acknowledgments

- [@d0x2f](https://github.com/d0x2f)
- [@Maxoos](https://github.com/Maxoos)
- [@OOtta](https://github.com/OOtta)
- [@ienthach](https://github.com/ienthach)
- [@PlayeTT](https://github.com/PlayeTT)
- [@chopeta](https://github.com/chopeta)
- [@santoshbmath](https://github.com/santoshbmath)
- [@BramFr](https://github.com/BramFr)

## Contributors

<table>
<tr>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/chrisleekr>
            <img src=https://avatars.githubusercontent.com/u/5715919?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=chrisleekr/>
            <br />
            <sub style="font-size:14px"><b>chrisleekr</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/romualdr>
            <img src=https://avatars.githubusercontent.com/u/5497356?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Romuald R./>
            <br />
            <sub style="font-size:14px"><b>Romuald R.</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/hipposen>
            <img src=https://avatars.githubusercontent.com/u/10888467?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=hipposen/>
            <br />
            <sub style="font-size:14px"><b>hipposen</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/thamlth>
            <img src=https://avatars.githubusercontent.com/u/45093611?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=thamlth/>
            <br />
            <sub style="font-size:14px"><b>thamlth</b></sub>
        </a>
    </td>
</tr>
</table>

## Disclaimer

I give no warranty and accepts no responsibility or liability for the accuracy
or the completeness of the information and materials contained in this project.
Under no circumstances will I be held responsible or liable in any way for any
claims, damages, losses, expenses, costs or liabilities whatsoever (including,
without limitation, any direct or indirect damages for loss of profits, business
interruption or loss of information) resulting from or arising directly or
indirectly from your use of or inability to use this code or any code linked to
it, or from your reliance on the information and material on this code, even if
I have been advised of the possibility of such damages in advance.

**So use it at your own risk!**

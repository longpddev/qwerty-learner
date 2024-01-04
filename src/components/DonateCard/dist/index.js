'use strict'
exports.__esModule = true
exports.DonateCard = void 0
var DonatingCard_1 = require('../DonatingCard')
var StickerButton_1 = require('../DonatingCard/components/StickerButton')
var useWordStats_1 = require('./hooks/useWordStats')
var constants_1 = require('@/constants')
var utils_1 = require('@/utils')
var noop_1 = require('@/utils/noop')
var react_1 = require('@headlessui/react')
var dayjs_1 = require('dayjs')
var react_2 = require('react')
var partytown_icon_1 = require('~icons/logos/partytown-icon')
exports.DonateCard = function () {
  var _a = react_2.useState(false),
    show = _a[0],
    setShow = _a[1]
  var _b = react_2.useState(undefined),
    amount = _b[0],
    setAmount = _b[1]
  var chapterNumber = useWordStats_1.useChapterNumber()
  var wordNumber = useWordStats_1.useWordNumber()
  var sumWrongCount = useWordStats_1.useSumWrongCount()
  var dayFromFirstWord = useWordStats_1.useDayFromFirstWordRecord()
  var dayFromQwerty = react_2.useMemo(function () {
    var now = dayjs_1['default']()
    var past = dayjs_1['default']('2021-01-21')
    return now.diff(past, 'day')
  }, [])
  var HighlightedText = function (_a) {
    var children = _a.children,
      className = _a.className
    return React.createElement('span', { className: 'font-bold  ' + (className ? className : 'text-indigo-500') }, children)
  }
  var onClickHasDonated = function () {
    utils_1.reportDonateCard({
      type: 'donate',
      chapterNumber: chapterNumber,
      wordNumber: wordNumber,
      sumWrongCount: sumWrongCount,
      dayFromFirstWord: dayFromFirstWord,
      dayFromQwerty: dayFromQwerty,
      amount: amount !== null && amount !== void 0 ? amount : 0,
    })
    setShow(false)
    var now = dayjs_1['default']()
    window.localStorage.setItem(constants_1.DONATE_DATE, now.format())
  }
  var onClickRemindMeLater = function () {
    utils_1.reportDonateCard({
      type: 'dismiss',
      chapterNumber: chapterNumber,
      wordNumber: wordNumber,
      sumWrongCount: sumWrongCount,
      dayFromFirstWord: dayFromFirstWord,
      dayFromQwerty: dayFromQwerty,
      amount: amount !== null && amount !== void 0 ? amount : 0,
    })
    setShow(false)
  }
  var onAmountChange = function (amount) {
    setAmount(amount)
  }
  react_2.useLayoutEffect(
    function () {
      if (chapterNumber && chapterNumber !== 0 && chapterNumber % 10 === 0) {
        var storedDate = window.localStorage.getItem(constants_1.DONATE_DATE)
        var date = dayjs_1['default'](storedDate)
        var now = dayjs_1['default']()
        var diff = now.diff(date, 'day')
        if (!storedDate || diff > 60) {
          setShow(true)
        }
      }
    },
    [chapterNumber],
  )
  return React.createElement(
    react_1.Transition.Root,
    { show: show, as: react_2.Fragment },
    React.createElement(
      react_1.Dialog,
      {
        as: 'div',
        className: 'relative z-50',
        onClose: function () {
          noop_1['default']()
        },
      },
      React.createElement(
        react_1.Transition.Child,
        {
          as: react_2.Fragment,
          enter: 'ease-out duration-300',
          enterFrom: 'opacity-0',
          enterTo: 'opacity-100',
          leave: 'ease-in duration-200',
          leaveFrom: 'opacity-100',
          leaveTo: 'opacity-0',
        },
        React.createElement('div', { className: 'fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity' }),
      ),
      React.createElement(
        'div',
        { className: 'fixed inset-0 z-10 overflow-y-auto' },
        React.createElement(
          'div',
          { className: 'flex min-h-full items-end justify-center p-4 text-center sm:items-center' },
          React.createElement(
            react_1.Transition.Child,
            {
              as: react_2.Fragment,
              enter: 'ease-out duration-300',
              enterFrom: 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95',
              enterTo: 'opacity-100 translate-y-0 sm:scale-100',
              leave: 'ease-in duration-200',
              leaveFrom: 'opacity-100 translate-y-0 sm:scale-100',
              leaveTo: 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95',
            },
            React.createElement(
              react_1.Dialog.Panel,
              {
                className:
                  'relative my-8 w-[37rem] transform select-text overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all',
              },
              React.createElement(
                'div',
                { className: 'flex w-full flex-col justify-center gap-4 bg-white px-2 pb-4 pt-5 dark:bg-gray-800 dark:text-gray-300' },
                React.createElement(
                  'h1',
                  { className: 'gradient-text w-full pt-3 text-center text-[2.4rem] font-bold' },
                  chapterNumber + ' Chapters Achievement !',
                ),
                React.createElement(
                  'div',
                  { className: 'flex w-full flex-col gap-4 px-4' },
                  React.createElement(
                    'p',
                    { className: 'mx-auto px-4 indent-4' },
                    'you just finished',
                    React.createElement(HighlightedText, null, ' ', chapterNumber, ' '),
                    'Chapter exercises, Qwerty Learner has already walked with you',
                    React.createElement(HighlightedText, null, ' ', dayFromFirstWord, ' '),
                    ' God, we finished it together',
                    React.createElement(HighlightedText, null, ' ', wordNumber, ' '),
                    'word exercises to help you correct ',
                    React.createElement(HighlightedText, null, ' ', sumWrongCount, ' '),
                    'Incorrect input times, let us cheer for your progress together',
                    React.createElement(partytown_icon_1['default'], { className: 'ml-2 inline-block', fontSize: 16 }),
                    React.createElement(partytown_icon_1['default'], { className: 'inline-block', fontSize: 16 }),
                    React.createElement(partytown_icon_1['default'], { className: 'inline-block', fontSize: 16 }),
                    React.createElement('br', null),
                  ),
                  React.createElement(
                    'p',
                    { className: 'mx-auto px-4 indent-4' },
                    'Qwerty Learner has persisted ',
                    React.createElement('span', { className: 'font-medium ' }, 'Open source, no advertising, no commercialization'),
                    ' ',
                    'operations',
                    React.createElement(HighlightedText, { className: 'text-indigo-500' }, ' ', dayFromQwerty, ' '),
                    " Today, our goal is to provide an efficient, convenient, and distraction-free learning environment for all learners. We sincerely invite you to consider making a donation, which will be used directly to maintain Qwerty's daily operations and future development, allowing Qwerty to grow with you.",
                  ),
                  React.createElement(
                    'p',
                    { className: 'mx-auto px-4 indent-4 ' },
                    'In order to thank you for your generosity, for a single donation of 50 RMB and above, we will give away 5 customized Qwerty stickers.',
                    React.createElement('span', { className: 'text-xs' }, '(Mainland area only)'),
                    '\uFF0CI hope you can share your happiness with your friends',
                  ),
                  React.createElement(
                    'div',
                    { className: 'flex items-center justify-center' },
                    React.createElement(StickerButton_1.StickerButton, null),
                  ),
                ),
                React.createElement(DonatingCard_1.DonatingCard, { className: 'mt-2', onAmountChange: onAmountChange }),
                React.createElement(
                  'div',
                  { className: 'flex w-full justify-between  px-14 pb-3 pt-0' },
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'my-btn-primary ' + (!amount && 'invisible') + ' w-36 bg-amber-500 font-medium transition-all',
                      onClick: onClickHasDonated,
                    },
                    'I have donated',
                  ),
                  React.createElement(
                    'button',
                    { type: 'button', className: 'my-btn-primary w-36 font-medium', onClick: onClickRemindMeLater },
                    'remind me later',
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

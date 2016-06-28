'use strict'

import sprintf from 'sprintf-js'
import Dialog from './dialog/dialog'
import consts from './constants'

export function extractArgs (a, fromPos = 0) {
  const args = []
  for (let i = fromPos; i < a.length; i++) {
    args[i - fromPos] = a[i]
  }
  return args
}

export function randomPrompt (prompts) {
  if (Array.isArray(prompts)) {
    const i = Math.floor(Math.random() * prompts.length)
    return prompts[i]
  }
  return prompts
}

export function composePrompt (ses, prompts, args) {
  let connector = ''
  let prompt = ''
  for (let i = 0; i < prompts.length; i++) {
    prompt += connector + ses.getText(randomPrompt(prompts[1]))
    connector = ' '
  }
  return args && args.length > 0 ? sprintf.vsprintf(prompt, args) : prompt
}

export function waterfall (steps) {
  return function waterfallAction (s, r) {
    const skip = function (result) {
      result = result || {}
      if (!result.resumed) {
        result.resumed = Dialog.ResumeReason.forward
      }
      waterfallAction(s, result)
    }
    if (r && r.hasOwnProperty('resumed')) {
      let step = s.dialogData[consts.Data.WaterfallStep]
      switch (r.resumed) {
        case Dialog.ResumeReason.back:
          step -= 1
          break
        default:
          step++
      }
      if (step >= 0 && step < steps.length) {
        try {
          s.dialogData[consts.Data.WaterfallStep] = step
          steps[step](s, r, skip)
        } catch (e) {
          delete s.dialogData[consts.Data.WaterfallStep]
          s.endDialog({
            resumed: Dialog.ResumeReason.notCompleted,
            error: e instanceof Error ? e : new Error(e.toString())
          })
        }
      } else {
        s.endDialog(r)
      }
    } else if (steps && steps.length > 0) {
      try {
        s.dialogData[consts.Data.WaterfallStep] = 0
        steps[0](s, r, skip)
      } catch (e) {
        delete s.dialogData[consts.Data.WaterfallStep]
        s.endDialog({
          resumed: Dialog.ResumeReason.notCompleted,
          error: e instanceof Error ? e : new Error(e.toString())
        })
      }
    } else {
      s.endDialog({
        resumed: Dialog.ResumeReason.notCompleted
      })
    }
  }
}

export function beginPrompt (session, args) {
  session.beginDialog(consts.DialogId.Prompts, args)
}

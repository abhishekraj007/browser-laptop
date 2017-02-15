/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const React = require('react')
const Immutable = require('immutable')
const ImmutableComponent = require('./immutableComponent')
const Dialog = require('./dialog')
const Button = require('./button')
const appActions = require('../actions/appActions')
const siteUtil = require('../state/siteUtil')
const ipc = require('electron').ipcRenderer
const messages = require('../constants/messages')
const urlParse = require('url').parse

class NoScriptCheckbox extends ImmutableComponent {
  toggleCheckbox (e) {
    this.checkbox.checked = !this.checkbox.checked
    e.stopPropagation()
  }

  get id () {
    return `checkbox-for-${this.props.origin}`
  }

  render () {
    return <div className='noScriptCheckbox' id={this.id}>
      <input type='checkbox' onClick={(e) => { e.stopPropagation() }}
        ref={(node) => { this.checkbox = node }} defaultChecked
        origin={this.props.origin} />
      <label htmlFor={this.id}
        onClick={this.toggleCheckbox.bind(this)}>{this.props.origin}</label>
    </div>
  }
}

class NoScriptInfo extends ImmutableComponent {
  get blockedOrigins () {
    const blocked = this.props.frameProps.getIn(['noScript', 'blocked'])
    if (blocked && blocked.size) {
      return new Immutable.Set(blocked.map(siteUtil.getOrigin))
    } else {
      return new Immutable.Set()
    }
  }

  get origin () {
    return siteUtil.getOrigin(this.props.frameProps.get('location'))
  }

  get isPrivate () {
    return this.props.frameProps.get('isPrivate')
  }

  reload () {
    ipc.emit(messages.SHORTCUT_ACTIVE_FRAME_CLEAN_RELOAD)
  }

  onAllow (setting, e) {
    if (!this.origin) {
      return
    }
    if (setting === false) {
      appActions.changeSiteSetting(this.origin, 'noScript', setting)
      this.reload()
    } else {
      let checkedOrigins = new Immutable.Map()
      this.checkboxes.querySelectorAll('input').forEach((box) => {
        const origin = box.getAttribute('origin')
        if (origin) {
          checkedOrigins = checkedOrigins.set(origin, box.checked ? setting : false)
        }
      })
      if (checkedOrigins.size) {
        appActions.setNoScriptExceptions(this.origin, checkedOrigins)
        this.reload()
      }
    }
  }

  get buttons () {
    if (!this.props.noScriptGlobalEnabled) {
      // NoScript is not turned on globally
      return <div><Button l10nId='allowScripts' className='actionButton'
        onClick={this.onAllow.bind(this, false)} /></div>
    } else {
      return <div>
        <Button l10nId='allowScriptsOnce' className='actionButton'
          onClick={this.onAllow.bind(this, 0)} />
        {this.isPrivate
          ? null
          : <span><Button l10nId='allowScriptsTemp' className='subtleButton'
            onClick={this.onAllow.bind(this, 1)} /></span>
        }
      </div>
    }
  }

  render () {
    if (!this.origin) {
      return null
    }
    const l10nArgs = {
      site: urlParse(this.props.frameProps.get('location')).host
    }
    return <Dialog onHide={this.props.onHide} className='noScriptInfo' isClickDismiss>
      <div className='dialogInner'>
        <div className='truncate' data-l10n-args={JSON.stringify(l10nArgs)}
          data-l10n-id={'scriptsBlocked'} />
        {this.blockedOrigins.size
          ? <div>
            <div ref={(node) => { this.checkboxes = node }}>
              {this.blockedOrigins.map((origin) => <NoScriptCheckbox origin={origin} />)}
            </div>
            {this.buttons}
          </div>
          : null}
      </div>
    </Dialog>
  }
}

NoScriptInfo.propTypes = {
  noScriptGlobalEnabled: React.PropTypes.bool,
  frameProps: React.PropTypes.object,
  onHide: React.PropTypes.func
}

module.exports = NoScriptInfo

'use strict'

const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('BOOTH_PROXY_PORT', 57172)

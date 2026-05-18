'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('BOOTH_PROXY_PORT', 57172)

contextBridge.exposeInMainWorld('boothStore', {
  save:  (data) => ipcRenderer.invoke('store:save', data),
  load:  ()     => ipcRenderer.invoke('store:load'),
  clear: ()     => ipcRenderer.invoke('store:clear'),
})

contextBridge.exposeInMainWorld('boothApp', {
  getVersion: () => ipcRenderer.invoke('app:version'),
})

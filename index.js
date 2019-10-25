const SDK = require('dat-sdk')
const { Hypercore, Hyperdrive, resolveName, deleteStorage, destroy } = SDK()

const defaultStorage = require('dat-storage')
// const alternativeSecretStorage = require('your-own-custom-random-access-file-module')

function keychainStorage() {
  const storage = defaultStorage('beepbooprobots', ...arguments)
  return {
    metadata: function(file, opts) {
      // if (file === 'secret_key') alternativeSecretStorage(file)
      console.log('storing', file)
      return storage.metadata(...arguments)
    },
    content: function(file, opts) {
      return storage.content(...arguments)
    }
  }
}

const archive = Hyperdrive(null, {
  // This archive will disappear after the process exits
  // This is here so that running the example doesn't clog up your history
  persist: true,
  // storage can be set to an instance of `random-access-*`
  // const RAI = require('random-access-idb')
  // otherwise it defaults to `random-access-web` in the browser
  // and `random-access-file` in node
  storage: keychainStorage  //storage: RAI
})

archive.ready(() => {
  const url = `dat://${archive.key.toString('hex')}`

  // TODO: Save this for later!
  console.log(`Here's your URL: ${url}`)

  // Check out the hyperdrive docs for what you can do with it
  // https://www.npmjs.com/package/hyperdrive#api
  archive.writeFile('/example.txt', 'Hello World!', () => {
    console.log('Written example file!')
  })
})

resolveName('dat://beakerbrowser.com', (err, url) => {
  if (err) throw err
  const archive = Hyperdrive(url)

  archive.readFile('/dat.json', 'utf8', (err, data) => {
    if (err) throw err
    console.log(`Beaker's dat.json is ${data}`)

    archive.close((err) => {
      if (err) throw err
      deleteStorage(archive.key, (e) => {
        if (e) throw e
        console.log('Deleted beaker storage')
      })
    })
  })
})

const SOME_URL = 'dat://0a9e202b8055721bd2bc93b3c9bbc03efdbda9cfee91f01a123fdeaadeba303e/'

const someArchive = Hyperdrive(SOME_URL)

reallyReady(someArchive, () => {
  someArchive.readdir('/', console.log)
})

// This make sure you sync up with peers before trying to do anything with the archive
function reallyReady (archive, cb) {
  if (archive.metadata.peers.length) {
    archive.metadata.update({ ifAvailable: true }, cb)
  } else {
    archive.metadata.once('peer-add', () => {
      archive.metadata.update({ ifAvailable: true }, cb)
    })
  }
}

// Create a hypercore
// Check out the hypercore docs for what you can do with it
// https://github.com/mafintosh/hypercore
const myCore = Hypercore(null, {
  valueEncoding: 'json',
  persist: false,
  // storage can be set to an instance of `random-access-*`
  // const RAI = require('random-access-idb')
  // otherwise it defaults to `random-access-web` in the browser
  // and `random-access-file` in node
  storage: null  // storage: RAI
})

// Add some data to it
myCore.append(JSON.stringify({
  name: 'Alice'
}), () => {
  // Use extension messages for sending extra data over the p2p connection
  const discoveryCoreKey = 'dat://bee80ff3a4ee5e727dc44197cb9d25bf8f19d50b0f3ad2984cfe5b7d14e75de7'
  const discoveryCore = new Hypercore(discoveryCoreKey, {
    extensions: ['discovery']
  })

  // When you find a new peer, tell them about your core
  discoveryCore.on('peer-add', (peer) => {
    console.log('Got a peer!')
    peer.extension('discovery', myCore.key)
  })

  // When a peer tells you about their core, load it
  discoveryCore.on('extension', (type, message) => {
    console.log('Got extension message', type, message)
    if (type !== 'discovery') return
    discoveryCore.close()

    const otherCore = new Hypercore(message, {
      valueEncoding: 'json',
      persist: false
    })

    // Render the peer's data from their core
    otherCore.get(0, console.log)
  })
})

const hypertrie = require('hypertrie')

// Pass in hypercores from the SDK into other dat data structures
// Check out what you can do with hypertrie from there:
// https://github.com/mafintosh/hypertrie
const trie = hypertrie(null, {
  feed: new Hypercore(null, {
    persist: false
  })
})

trie.put('key', 'value', () => {
  trie.get('key', (err, node) => {
    console.log('Got key: ', node.key)
    console.log('Loaded value from trie: ', node.value)
  })
})

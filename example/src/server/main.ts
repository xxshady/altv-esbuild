import * as alt from 'alt-server'

alt.on('playerConnect', (player) => {
  alt.log('~gl~[playerConnect]~w~', 'player:~cl~', player.name)
  
  player.model = 'mp_m_freemode_01'
  player.spawn(0, 0, 72)
  
  alt.log(
    'player streamSyncedMeta:', 
    player.hasStreamSyncedMeta('test') // any player's meta will be internally cleared on hot reload restart
  )
  // will be cleared on hot reload restart
  player.setStreamSyncedMeta('test', 123)

  alt.setTimeout(() => {
    // this vehicle will be automatically destroyed on hot reload restart
    const veh = new alt.Vehicle('sultan3', 0, 5, 71, 0, 0, 0)
    player.setIntoVehicle(veh, 1)
  }, 1000)
})

// try to change this line and save the file
alt.log('it works?', 1, {
  d: alt.Object
})


const v = new alt.Vehicle('sultan', 0, 0, 0, 0, 0, 0)
alt.log({
  v,
  all: alt.Vehicle.all,
})


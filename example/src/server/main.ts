import * as alt from 'alt-server'

// altvEnums feature https://xxshady.github.io/altv-esbuild/interfaces/ipluginoptions.html#altvenums
import { RadioStation } from 'altv-enums' 

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
    veh.activeRadioStation = RadioStation.BlaineCountyRadio
    player.setIntoVehicle(veh, 1)
  }, 1000)
})

// try to change this line and save the file
alt.log('it works?', RadioStation.BlaineCountyRadio)

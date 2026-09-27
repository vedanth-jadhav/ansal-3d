/* Targets resolve by stable POI ID from current map data. No new map coordinates. */
export const missionDefinitions=[
 {id:'explore-six-stops',version:1,title:'Township explorer',kind:'exploration',stages:[{type:'visitUnordered',poiIds:['regencia','temple','watertank','sector12','sector18','dblock'],mode:'either'}]},
 {id:'courier-loop',version:1,title:'Courier loop',kind:'delivery',timer:240,stages:[{type:'collect',poiId:'regencia',mode:'walk'},{type:'deliver',poiId:'temple',mode:'either'},{type:'returnToStart',poiId:'regencia',mode:'either'}]},
 {id:'three-stop-sprint',version:1,title:'Three-stop sprint',kind:'route',timer:360,stages:[{type:'visitOrdered',poiId:'regencia',mode:'either'},{type:'visitOrdered',poiId:'temple',mode:'either'},{type:'visitOrdered',poiId:'watertank',mode:'either'}]},
 {id:'field-survey',version:1,title:'Field survey',kind:'exploration',stages:[{type:'visitUnordered',poiIds:['temple','watertank','sector12','sector18'],mode:'walk'}]}
];

import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRoadMask} from '../src/districts/road-mask.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/osm.json',import.meta.url)));
test('recovered road mask rejects a segment crossing a box interior',()=>{const mask=createRoadMask([{tags:{highway:'residential'},coordinates:[[-10,0],[10,0]]}]);assert.ok(mask.boxGap(0,0,2,2)<0);assert.ok(mask.boxGap(0,15,2,2)>0)});
test('C Block CBLE-019 anchor is in an OSM road corridor, not a buildable coordinate',()=>{const mask=createRoadMask(data.roads);assert.ok(mask.pointGap(161,135.7)<0)});

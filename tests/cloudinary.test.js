import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { uploadAuthorization, ownedCloudinaryAsset, signParameters } from '../lib/cloudinary.js';

const config={cloudName:'test-cloud',apiKey:'test-key',apiSecret:'test-secret'};
test('signed upload is scoped to generated ID and never exposes secret',()=>{
  const auth=uploadAuthorization({type:'image/jpeg',size:2048},config);
  assert.match(auth.parameters.public_id,/^gd-painel\/[a-f0-9-]{36}$/);
  assert.equal(auth.url,'https://api.cloudinary.com/v1_1/test-cloud/image/upload');
  assert.equal(JSON.stringify(auth).includes(config.apiSecret),false);
  assert.equal(auth.parameters.overwrite,false);
});
test('signature sorts parameters and uses Cloudinary default SHA-1',()=>{
  assert.equal(signParameters({timestamp:123,overwrite:false},'secret'),createHash('sha1').update('overwrite=false&timestamp=123secret').digest('hex'));
});
test('free-plan application limits reject oversized and unsupported files',()=>{
  assert.throws(()=>uploadAuthorization({type:'image/png',size:11*1024*1024},config));
  assert.throws(()=>uploadAuthorization({type:'video/mp4',size:101*1024*1024},config));
  assert.throws(()=>uploadAuthorization({type:'text/html',size:100},config));
  assert.throws(()=>uploadAuthorization({type:'image/png',size:0},config));
  assert.equal(uploadAuthorization({type:'video/mp4',size:99*1024*1024},config).resourceType,'video');
});
test('deletion only accepts this cloud and panel-generated IDs',()=>{
  const id='gd-painel/12345678-1234-1234-1234-123456789012';
  const url=`https://res.cloudinary.com/test-cloud/image/upload/v123/${id}.jpg`;
  assert.equal(ownedCloudinaryAsset(url,config).publicId,id);
  for(const invalid of [url.replace('test-cloud','another-cloud'),url.replace('res.cloudinary.com','example.com'),url.replace('gd-painel/','unrelated/'),url.replace('https:','http:')])assert.throws(()=>ownedCloudinaryAsset(invalid,config));
});

/**
 * Copyright (c) 2015-present, Parse, LLC.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

import ParseACL from './ParseACL';
import ParseFile from './ParseFile';
import ParseGeoPoint from './ParseGeoPoint';
import ParseObject from './ParseObject';
import { Op } from './ParseOp';
import ParseRelation from './ParseRelation';

var toString = Object.prototype.toString;

function encode(value: mixed, disallowObjects: boolean, forcePointers: boolean, seen: Array<mixed>) {
  if (value instanceof ParseObject) {
    if (disallowObjects) {
      throw new Error('Parse Objects not allowed here');
    }
    var seenEntry = value.id ? value.className + ':' + value.id : value;
    if (forcePointers ||
      !seen ||
      seen.indexOf(seenEntry) > -1 ||
      value.dirty() ||
      Object.keys(value._getServerData()).length < 1
    ) {
      return value.toPointer();
    }
    seen = seen.concat(seenEntry);
    var json = encode(value.attributes, disallowObjects, forcePointers, seen);
    if (json.createdAt) {
      json.createdAt = json.createdAt.iso;
    }
    if (json.updatedAt) {
      json.updatedAt = json.updatedAt.iso;
    }
    json.className = value.className;
    json.__type = 'Object';
    if (value.id) {
      json.objectId = value.id;
    }
    return json;
  }
  if (value instanceof Op ||
      value instanceof ParseACL ||
      value instanceof ParseGeoPoint ||
      value instanceof ParseRelation) {
    return value.toJSON();
  }
  if (value instanceof ParseFile) {
    if (!value.url()) {
      throw new Error('Tried to encode an unsaved file.');
    }
    return value.toJSON();
  }
  if (toString.call(value) === '[object Date]') {
    if (isNaN(value)) {
      throw new Error('Tried to encode an invalid date.');
    }
    return { __type: 'Date', iso: value.toJSON() };
  }
  if (toString.call(value) === '[object RegExp]' &&
      typeof value.source === 'string') {
    return value.source;
  }

  if (Array.isArray(value)) {
    return value.map((v) => {
      return encode(v, disallowObjects, forcePointers, seen);
    });
  }

  if (value && typeof value === 'object') {
    var output = {};
    for (var k in value) {
      output[k] = encode(value[k], disallowObjects, forcePointers, seen);
    }
    return output;
  }

  return value;
}

export default function(value: mixed, disallowObjects?: boolean, forcePointers?: boolean, seen?: Array<mixed>) {
  return encode(value, !!disallowObjects, !!forcePointers, seen || []);
}

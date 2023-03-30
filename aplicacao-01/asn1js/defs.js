// ASN.1 RFC definitions matcher
// Copyright (c) 2023-2023 Lapo Luchini <lapo@lapo.it>

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
// 
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

(typeof define != 'undefined' ? define : function (factory) { 'use strict';
    if (typeof module == 'object') module.exports = factory(function (name) { return require(name); });
    else window.defs = factory(function (name) { return window[name.substring(2)]; });
})(function (require) {
'use strict';

const rfc = require('./rfcdef');

function translate(def, tn) {
    const id = def?.id;
    if (def?.type == 'tag' && !def.explicit)
        // def.type = def.content[0].type;
        def = def.content[0].type;
    while (def?.type == 'defined' || def?.type?.type == 'defined') {
        const name = def?.type?.type ? def.type.name : def.name;
        def = Object.assign({}, def);
        def.type = Defs.searchType(name).type;
    }
    if (def?.type?.name == 'CHOICE') {
        for (let c of def.type.content) {
            c = translate(c);
            if (tn == c.type.name || tn == c.name) {
                def = Object.assign({}, def);
                def.type = c.type.name ? c.type : c;
                break;
            }
        }
    }
    if (id)
        def = Object.assign({}, def, { id });
    return def ?? { type: {} };
}

function firstUpper(s) {
    return s[0].toUpperCase() + s.slice(1);
}

class Defs {

    static moduleAndType(mod, name) {
        return Object.assign({ module: { oid: mod.oid, name: mod.name, source: mod.source } }, mod.types[name]);
    }

    static searchType(name) {
        for (const mod of Object.values(rfc))
            if (name in mod.types) {
                // console.log(name + ' found in ' + r.name);
                // return r.types[name];
                return Defs.moduleAndType(mod, name);
            }
        throw 'Type not found: ' + name;
    }

    static match(value, def, stats = { total: 0, recognized: 0, defs: {} }) {
        value.def = {};
        let tn = value.typeName();
        def = translate(def, tn);
        ++stats.total;
        if (def?.type) {
            value.def = def;
            if (def.id || def.name) ++stats.recognized;
        }
        if (value.sub !== null) {
            if (def?.type?.type)
                def = def.type;
            let j = def?.content ? 0 : -1;
            for (const subval of value.sub) {
                let type;
                if (j >= 0) {
                    if (def.typeOf)
                        type = def.content[0];
                    else {
                        let tn = subval.typeName(); //.replaceAll('_', ' ');
                        do {
                            type = def.content[j++];
                            // type = translate(type, tn);
                            if (type?.type?.type)
                                type = type.type;
                        } while (type && ('optional' in type || 'default' in type) && type.name != 'ANY' && type.name != tn);
                        if (type?.type == 'defined')
                            stats.defs[type.id] = subval.content().split(/\n/);
                        else if (type?.definedBy && stats.defs?.[type.definedBy]?.[1]) // hope current OIDs contain the type name (will need to parse from RFC itself)
                            type = Defs.searchType(firstUpper(stats.defs[type.definedBy][1]));
                    }
                }
                Defs.match(subval, type, stats);
            }
        }
        return stats;
    }

}

Defs.RFC = rfc;

Defs.commonTypes = [
    [ 'X.509 certificate', '1.3.6.1.5.5.7.0.18', 'Certificate' ], 
    [ 'CMS / PKCS#7 envelope', '1.2.840.113549.1.9.16.0.14', 'ContentInfo' ],
    [ 'PKCS#8 encrypted private key', '1.2.840.113549.1.8.1.1', 'EncryptedPrivateKeyInfo' ],
].map(arr => ({ description: arr[0], ...Defs.moduleAndType(rfc[arr[1]], arr[2]) }));

return Defs;

});

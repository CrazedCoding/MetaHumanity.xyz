var StringUtils = {
    readUTF16String: function(bytes, bigEndian, maxBytes) {
        var ix = 0;
        var offset1 = 1, offset2 = 0;
        maxBytes = Math.min(maxBytes||bytes.length, bytes.length);

        if( bytes[0] == 0xFE && bytes[1] == 0xFF ) {
            bigEndian = true;
            ix = 2;
        } else if( bytes[0] == 0xFF && bytes[1] == 0xFE ) {
            bigEndian = false;
            ix = 2;
        }
        if( bigEndian ) {
            offset1 = 0;
            offset2 = 1;
        }

        var arr = [];
        for( var j = 0; ix < maxBytes; j++ ) {
            var byte1 = bytes[ix+offset1];
            var byte2 = bytes[ix+offset2];
            var word1 = (byte1<<8)+byte2;
            ix += 2;
            if( word1 == 0x0000 ) {
                break;
            } else if( byte1 < 0xD8 || byte1 >= 0xE0 ) {
                arr[j] = String.fromCharCode(word1);
            } else {
                var byte3 = bytes[ix+offset1];
                var byte4 = bytes[ix+offset2];
                var word2 = (byte3<<8)+byte4;
                ix += 2;
                arr[j] = String.fromCharCode(word1, word2);
            }
        }
        var string = new String(arr.join(""));
        string.bytesReadCount = ix;
        return string;
    },
    readUTF8String: function(bytes, maxBytes) {
        var ix = 0;
        maxBytes = Math.min(maxBytes||bytes.length, bytes.length);

        if( bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF ) {
            ix = 3;
        }

        var arr = [];
        for( var j = 0; ix < maxBytes; j++ ) {
            var byte1 = bytes[ix++];
            if( byte1 == 0x00 ) {
                break;
            } else if( byte1 < 0x80 ) {
                arr[j] = String.fromCharCode(byte1);
            } else if( byte1 >= 0xC2 && byte1 < 0xE0 ) {
                var byte2 = bytes[ix++];
                arr[j] = String.fromCharCode(((byte1&0x1F)<<6) + (byte2&0x3F));
            } else if( byte1 >= 0xE0 && byte1 < 0xF0 ) {
                var byte2 = bytes[ix++];
                var byte3 = bytes[ix++];
                arr[j] = String.fromCharCode(((byte1&0xFF)<<12) + ((byte2&0x3F)<<6) + (byte3&0x3F));
            } else if( byte1 >= 0xF0 && byte1 < 0xF5) {
                var byte2 = bytes[ix++];
                var byte3 = bytes[ix++];
                var byte4 = bytes[ix++];
                var codepoint = ((byte1&0x07)<<18) + ((byte2&0x3F)<<12)+ ((byte3&0x3F)<<6) + (byte4&0x3F) - 0x10000;
                arr[j] = String.fromCharCode(
                    (codepoint>>10) + 0xD800,
                    (codepoint&0x3FF) + 0xDC00
                );
            }
        }
        var string = new String(arr.join(""));
        string.bytesReadCount = ix;
        return string;
    },
    readNullTerminatedString: function(bytes, maxBytes) {
        var arr = [];
        maxBytes = maxBytes || bytes.length;
        for ( var i = 0; i < maxBytes; ) {
            var byte1 = bytes[i++];
            if( byte1 == 0x00 ) break;
		    arr[i-1] = String.fromCharCode(byte1);
	    }	    
        var string = new String(arr.join(""));
        string.bytesReadCount = i;
        return string;
    }
};

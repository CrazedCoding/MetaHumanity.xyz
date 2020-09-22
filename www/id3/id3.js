(function(ns) {
    var ID3 = ns.ID3 = {};
    
    function BufferedBinaryFile(data, iLength, blockSize, blockRadius) {

	function pack(bytes, length) {
	    var chars = [];
	    for(var i = 0, n = length; i < n;) {
		chars.push(((bytes[i++] & 0xff) << 8) | (bytes[i++] & 0xff));
	    }
	    return String.fromCharCode.apply(null, chars);
	}

	function unpack(str) {
	    var bytes = [];
	    for(var i = 0, n = str.length; i < n; i++) {
		var char = str.charCodeAt(i);
		bytes.push(char >>> 8, char & 0xFF);
	    }
	    return bytes;
	}

        var undefined;
        var downloadedBytesCount = 0;
        var binaryFile = new BinaryFile("", 0, iLength);
        var blocks = [];
        
        blockSize = blockSize || 1024*2;
        blockRadius = (typeof blockRadius === "undefined") ? 0 : blockRadius;
        blockTotal = ~~((iLength-1)/blockSize) + 1;
        
        function getBlockRangeForByteRange(range) {
            var blockStart = ~~(range[0]/blockSize) - blockRadius;
            var blockEnd = ~~(range[1]/blockSize)+1 + blockRadius;
            
            if( blockStart < 0 ) blockStart = 0;
            if( blockEnd >= blockTotal ) blockEnd = blockTotal-1;
            
            return [blockStart, blockEnd];
        }
        
        // TODO: wondering if a "recently used block" could help things around
        //       here.
        function getBlockAtOffset(offset) {
            var blockRange = getBlockRangeForByteRange([offset, offset]);
            waitForBlocks(blockRange);
            return blocks[~~(offset/blockSize)];
        }
        
        function waitForBlocks(blockRange) {
            // Filter out already downloaded blocks or return if found out that
            // the entire block range has already been downloaded.
            while( blocks[blockRange[0]] ) {
                blockRange[0]++;
                if( blockRange[0] > blockRange[1] ) return;
            }
            while( blocks[blockRange[1]] ) {
                blockRange[1]--;
                if( blockRange[0] > blockRange[1] ) return;
            }
            var range = [blockRange[0]*blockSize, (blockRange[1]+1)*blockSize-1];
            //console.log("Getting: " + range[0] + " to " +  range[1]);
            
            var size = iLength;
            // Range header not supported
            if( size == iLength ) {
                blockRange[0] = 0;
                blockRange[1] = blockTotal-1;
                range[0] = 0;
                range[1] = iLength-1;
            }
var s = "";
for(var i=0,l=iLength; i<l; i++)
    s += String.fromCharCode((data[i]));
            var block = {
                data: s,
                offset: range[0]
            };
            
            for( var i = blockRange[0]; i <= blockRange[1]; i++ ) {
                blocks[i] = block;
            }
            downloadedBytesCount += range[1] - range[0] + 1;
        }
        
        // Mixin all BinaryFile's methods.
        // Not using prototype linking since the constructor needs to know
        // the length of the file.
        for( var key in binaryFile ) {
            if( binaryFile.hasOwnProperty(key) &&
                typeof binaryFile[key] === "function") {
                this[key] = binaryFile[key];
            }
        }
        /** 
         * @override
         */
		this.getByteAt = function(iOffset) {
		    var block = getBlockAtOffset(iOffset);
		    if( typeof block.data == "string" ) {
		        return block.data.charCodeAt(iOffset - block.offset) & 0xFF;
		    } else if( typeof block.data == "unknown" ) {
		        return IEBinary_getByteAt(block.data, iOffset - block.offset);
		    }
		};
		
		/**
		 * Gets the number of total bytes that have been downloaded.
		 *
		 * @returns The number of total bytes that have been downloaded.
		 */
		this.getDownloadedBytesCount = function() {
		    return downloadedBytesCount;
		};
		
		/**
		 * Downloads the byte range given. Useful for preloading.
		 *
		 * @param {Array} range Two element array that denotes the first byte to be read on the first position and the last byte to be read on the last position. A range of [2, 5] will download bytes 2,3,4 and 5.
		 */
		this.loadRange = function(range) {
		    var blockRange = getBlockRangeForByteRange(range);
		    waitForBlocks(blockRange);
		};
    }
	var files = [];
    
    function getReader(data) {
        // FIXME: improve this detection according to the spec
        return data.getStringAt(4, 7) == "ftypM4A" ? ID4 :
               (data.getStringAt(0, 3) == "ID3" ? ID3v2 : ID3v1);
    }
    
	function readFileDataFromAjax(data, callback) {
	}

    function readFileDataFromFileSystem(url, callback) {
        ReadFile(
            url,
            function(file) {
                var reader = getReader(file);
				if (callback) callback(reader, file);
				file.close();
            }
        )
    }
    
    ID3.loadTags = function(data, length, name, cb, tags) {
		function read(reader, data) {
	        var tagsFound = reader.readTagsFromData(data, tags);
	        //console.log("Downloaded data: " + data.getDownloadedBytesCount() + "bytes");
	        // FIXME: add, don't override
			files[name] = tagsFound;
			if (cb) cb();
	    }
	    


	    var newData = new BufferedBinaryFile(data, length);
		var reader = getReader(newData);
		var range = reader.readID3Range(newData);
	    newData.loadRange(range);
	    read(reader, newData);
	}

	ID3.getAllTags = function(url) {
		if (!files[url]) return null;
        
		var tags = {};
		for (var a in files[url]) {
			if (files[url].hasOwnProperty(a))
				tags[a] = files[url][a];
		}
		return tags;
	}

	ID3.getTag = function(url, tag) {
		if (!files[url]) return null;

		return files[url][tag];
	}
	
	// Export functions for closure compiler
	ns["ID3"] = ns.ID3;
	ID3["loadTags"] = ID3.loadTags;
	ID3["getAllTags"] = ID3.getAllTags;
	ID3["getTag"] = ID3.getTag;
})(this);

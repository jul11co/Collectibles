Collectibles
===

Managing personal digital collections of magazines, books & comics.

###FEATURES
* Organize magazines (PDF files), books (PDF files) and comics (CBR, CBZ,... files).
* Metadata for added documents.
* Web UI (default address: http://127.0.0.1:8810/)
* Accessible from local network.
* Local databases (featuring [nedb](https://github.com/louischatriot/nedb) and [leveldb](https://github.com/Level/levelup)).
* Automatic cover extraction.
* Web UI for reading comic books.
* Reading List

###INSTALL

Checkout this repository to local directory.

```
npm install
bower install
npm link
```

This app uses `pdf-image` package to retrieve information from PDF file. The package requires external tools (`convert`, `gs`, `pdfinfo` - available on Mac OS X and Linux) which must be installed before using ([more info](https://www.npmjs.com/package/pdf-image)).

**Mac**

```
brew install imagemagick ghostscript poppler
```

**Ubuntu**

```
sudo apt-get install imagemagick ghostscript poppler-utils
```

This app also uses `unpack-all` package to extract information from comic book file (CBR,CBZ,...). It also requires some external tools, such as `unar` or `lsar` (more info: [here](https://www.npmjs.com/package/unpack-all) and [here](http://unarchiver.c3.cx/commandline)).

###RUN

**Server**

```
collectibles-server
```

*With ComicVine*

Collectibles Server comes with ComicVine search & browse features (for volumes & series). ComicVine API requires API key (obtains from http://comicvine.gamespot.com/api/). If you want to use these features, get API key from ComicVine website and do as following:

```
export CV_API_KEY=<ComicVine API Key>
collectibles-server
```

**Scanner**

Collectibles Scanner currently is only way to add documents to Collectibles Server.

*Note*: In order to scanner from working, the server must be run first.

```
collectibles-scanner [options] <directory>

Options:
  --magazine       : to scan magazines (PDF files)
  --book           : to scan books (PDF files)
  --comic          : to scan comics (CBR, CBZ,... files)
```

Found documents of each types will be added to Collectibles, which can be seen by accessing to web UI at http://127.0.0.1:8810/

To add more documents, just run `collectibles-scanner` again. New documents will be added automatically.

###LICENSE

The MIT License (MIT)

Copyright (c) 2016 Jul11Co

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

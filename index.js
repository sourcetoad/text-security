var
  icons2font      = require('svgicons2svgfont'),
  fs              = require('fs'),
  path            = require('path'),
  svg2ttf         = require('svg2ttf'),
  ttf2eot         = require('ttf2eot'),
  ttf2woff        = require('ttf2woff'),
  args            = require('yargs').argv;
/**
 * We need to loop through the unicode character list and pass them all for svgicons2svgfont.
 * If you want to reduce the file-sizes with the cost of worse character support, you can
 * specify --max={number} when building. This number will be the highest supported character
 * code. For example, building with `npm run build -- --max=126` would only support the Basic Latin unicode block.
 *
 * @todo Perhaps this could be better achieved by just defining the notdef glyph?
 * That would probably reduce the file sizes quite a bit, but I'm not quite sure how that would work with the
 * tff and woff versions.
 * @param {number=} [max=767]
 */
var MAX_VALUE = args.max || 767;
/**
 * Comma-separated list of the supported shapes.
 * @param {string} [shapes='circle,square,disc']
 */
var SHAPES = args.shapes || 'circle,square,disc';

var styleTemplate = fs.readFileSync('style-template.css', 'utf-8'), stylesheet = '',
  characters = [];

for (var i = 0; i <= MAX_VALUE; i++){
  characters.push(String.fromCharCode(i));
}

function bufferFrom(source) {
  return typeof Buffer.from === 'function' ? Buffer.from(source) : new Buffer(source);
}

function logError(err) {
  if (err) {
    console.error(err);
  }
}

var DIST_DIR = path.join(__dirname, 'dist');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
} 

SHAPES.split(',').forEach(function (shape) {
  var
    fontName = 'text-security-' + shape,
    fontPath = path.join(DIST_DIR, fontName),
    fontStream = icons2font({
      fontName: fontName
    });

  fontStream
    .pipe(fs.createWriteStream(fontPath + '.svg'))//Create the .svg font
    .on('finish', function () {
      //Create the other formats using the newly created font and Fontello's conversion libs

      var ttf = svg2ttf(fs.readFileSync(fontPath + '.svg', 'utf-8'), {});
      fs.writeFileSync(fontPath + '.ttf', bufferFrom(ttf.buffer), 'utf-8');

      // ttf2eot and ttf2woff expect a buffer, while svg2ttf seems to expect a string
      // this would be better read from the buffer, but will do for now
      var ttfFile = fs.readFileSync(fontPath + '.ttf');

      var eot = ttf2eot(ttfFile, {});
      fs.writeFile(fontPath + '.eot', bufferFrom(eot.buffer), 'utf-8', logError);

      var woff = ttf2woff(ttfFile, {});
      fs.writeFile(fontPath + '.woff', bufferFrom(woff.buffer), 'utf-8', logError);
    })
    .on('error', logError);

  var glyph = fs.createReadStream(path.join(__dirname, 'assets', shape + '.svg'));
  glyph.metadata = {
    unicode: characters,
    name: shape
  };
  fontStream.write(glyph);
  fontStream.end();
  //Append the new shape to the generated stylesheet
  stylesheet += styleTemplate.replace(/\{\{shape}}/g, shape) + '\n';
});

fs.writeFile(path.join(__dirname, 'dist', 'text-security.css'), stylesheet, logError);
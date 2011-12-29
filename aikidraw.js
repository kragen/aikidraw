// TODO:
// D draw lines with mouse
// D fix it so it works in Firefox
// D store lines in localStorage
// D namespace everything
// D add different colors
//   D make drawing be a list of line-drawing instructions instead of
//     a list of lines
//   D add two color change buttons (black and white) in HTML
//   D add some more of them
//   D make them change the drawing color
//   D add color change instruction so that color change can be saved
//     D add a runAndSave function and use it for lines
//     D make colorbutton click handler call it too
//   D add current color indicator area
// D reorganize code
// D add different thicknesses (exponential pen sizes?)
//   D basic addition done
//   D circular pens
// D add different opacities
//   D added basic opacity, but now need to
// D find out how to get image data from the canvas, needed for two
//   things: the e eyedropper color picker, and faster redraws after
//   undo or editing an existing stroke.  I *could* use
//   canvas.toDataURL to take snapshots but I’d rather not.  Aha,
//   getImageData() returns a snapshot, putImageData(snapshot, 0, 0)
//   restores, and the imagedata itself is an RGBA 8-bit array on the
//   property .data.
// D add undo
// D add redo
// D make keys work in Firefox!  WTF is wrong?  oh, you have to listen
//   on document, not document.body, for unfocused keypresses.
// D add eyedropper color picker
// D fix mouseup in the rest of the document
// D add keyboard shortcuts: e for picking color from under the mouse,
//   z for undo, y for redo, [ for smaller brush, ] for larger brush,
//   < to increase opacity, > to decrease opacity
// D use , penSizes: [ 1, 2, 4, 8, 16, 32, 64, 128 ]
// D opacity controls backwards; fix them. allow , and . instead of < and >
// D don't go fully transparent
// D quickly kludge out the save-on-mouse-up thing
// D add buttons to change pen size
// D redraw color indicator to indicate pen size
// D redraw color indicator to indicate opacity
// D make eyedropper work properly with respect to alpha!
// D remove no-longer-needed schema upgrade code
// D replace `capo.` with `aiki.` in all the JS
// D prevent doubleclicks on canvas from selecting stuff
// D handle window reflows correctly!
// - Redraw with snapshots.  The imagedata being RGBA 8-bit means
//   512x512 is a meg of memory down the drain, so we probably don’t
//   want to save more than about 30 of those snapshots.  (Although
//   a PNG from .toDataURL() was only 215K.)   This will
//   enable the stroke drawing code to be totally revamped so that
//   you’re drawing entire multi-line strokes instead of bunches of
//   individual lines, which will also accomplish the following:
//   D make undo undo more than a single pixel’s worth at a time
//   D make undo reasonably efficient on large drawings
//   D cut storage requirements by a factor of 2 or 3
// D totally revamp stroke drawing code to stop putting blots in the
//   middle of translucent lines.  Technically for this I only need a
//   single snapshot.
// D add buttons to change opacity
// - save redo stack persistently!
// - make lines long enough to be sensibly antialiased
// - make localStorage linear-time
// - make localStorage memory-efficient
// - add triangle/circle color picker
// - add keyboard shortcut: p for a palette
// - write a server-side so sketches can be shared
// - add timed replay
// - record delays for replay
// - display a moving colored translucent dot under the cursor
// - rename “command“s to “action“s? or “changes” or “deltas”?
// - does undo need to updateColorDisplay?
// - do < > [ ] need to update the display of the current stroke?
// - get performance to be acceptable again in Firefox
// - make clicking (as opposed to dragging) make dots

var aiki =
    { drawPos: null
    , mousePos: { x: 0, y: 0 }
    , drawing: []
    , penSizes: [ 1, 2, 4, 8, 16, 32, 64, 128 ]
    , redoStack: []
    , pendingRedraw: null

    , setup: function() {
        var cv = $('#c')

        aiki.cx = cv[0].getContext('2d')

        cv
        .mousedown(aiki.mouseDownHandler)
        .mousemove(aiki.mouseMoveHandler)

        $(document)
        .keypress(aiki.keyHandler)
        .mouseup(aiki.mouseUpHandler)

        $('.colorbutton').click(function(ev) {
          aiki.runAndSave('c' + this.style.backgroundColor)
        })

        $('.switchToSmallerPen').click(aiki.switchToSmallerPen)
        $('.switchToLargerPen').click(aiki.switchToLargerPen)
        $('.decreaseOpacity').click(aiki.decreaseOpacity)
        $('.increaseOpacity').click(aiki.increaseOpacity)

        if (localStorage.currentDrawing) {
          aiki.drawing = JSON.parse(localStorage.currentDrawing)
        }
        aiki.redraw()
      }

    , mouseDownHandler: function(ev) {
        ev.preventDefault()
        aiki.strokeStart = new Date()
        aiki.drawPos = aiki.evPos(ev)

        var cv = aiki.cx.canvas
        aiki.snapshot = aiki.cx.getImageData(0, 0, cv.width, cv.height)
        aiki.currentStroke = [aiki.drawPos.x, aiki.drawPos.y]
        aiki.drawWithStroke()
      }

    , drawWithStroke: function() {
        aiki.cx.putImageData(aiki.snapshot, 0, 0)
        aiki.drawStroke(aiki.currentStroke)
      }

    , mouseUpHandler: function() {
        if (!aiki.drawPos) return

        // Crudely measure performance.
        if (window.console) {
          var strokeTime = new Date().getTime() - aiki.strokeStart.getTime()
            , dn = aiki.currentStroke.length/2 -1
          console.log('drew '+dn+' segments in '+strokeTime+' ms for Hz='
                     + Math.round(dn/strokeTime*1000)
                     )
        }

        aiki.drawPos = null
        aiki.cx.putImageData(aiki.snapshot, 0, 0)
        delete aiki.snapshot

        // Convert current stroke into a line command.
        aiki.runAndSave("L"+aiki.currentStroke.join(' '))
        delete aiki.currentStroke

        aiki.saveDrawing()
      }

    , mouseMoveHandler: function(ev) {
        var newPos = aiki.evPos(ev)
        aiki.mousePos = newPos

        var oldPos = aiki.drawPos
        if (!oldPos) return

        // Very simple front-end drawing simplification: if the
        // mouse has moved zero or one pixels, that’s not
        // enough.  Hopefully this is useful and not annoying.
        if (aiki.manhattanDistance(oldPos, newPos) < 2) return

        aiki.currentStroke.push(newPos.x)
        aiki.currentStroke.push(newPos.y)

        aiki.drawPos = newPos

        aiki.drawWithStroke()
      }

    , evPos: function(ev) {
        return { x: ev.pageX - aiki.cx.canvas.offsetLeft
               , y: ev.pageY - aiki.cx.canvas.offsetTop
               }
      }

    , manhattanDistance: function(a, b) {
        return (Math.abs(a.x - b.x) +
                Math.abs(a.y - b.y))
      }

    , keyHandler: function(ev) {
        var k = aiki.keyMap[String.fromCharCode(ev.which)]
        if (k) aiki[k]()
      }

    , keyMap: { '[': 'switchToSmallerPen'
              , ']': 'switchToLargerPen'
              , '>': 'increaseOpacity'
              , '.': 'increaseOpacity'
              , '<': 'decreaseOpacity'
              , ',': 'decreaseOpacity'
              , 'z': 'undo'
              , 'y': 'redo'
              , 'e': 'pickColorFromImage'
              }

    , switchToSmallerPen: function() {
        var idx = aiki.penSizes.indexOf(aiki.penSize)
        // Do nothing if already at smallest pen size.
        if (idx === 0) return
        if (idx === -1) idx = 1 // Can’t happen!
        idx--
        aiki.runAndSave('s' + aiki.penSizes[idx])
      }

    , switchToLargerPen: function() {
        var idx = aiki.penSizes.indexOf(aiki.penSize)
        if (idx === aiki.penSizes.length - 1) return
        idx++
        aiki.runAndSave('s' + aiki.penSizes[idx])
      }

    , increaseOpacity: function() {
        var opacity = Math.min(1, aiki.opacity + 0.125)
        aiki.runAndSave('a' + opacity)
      }

    , decreaseOpacity: function() {
        var opacity = Math.max(0.125, aiki.opacity - 0.125)
        aiki.runAndSave('a' + opacity)
      }

    , undo: function() {
        if (!aiki.drawing.length) return

        var command = aiki.drawing.pop()
        aiki.redoStack.push(command)
        if (aiki.pendingRedraw) clearTimeout(aiki.pendingRedraw)
        aiki.pendingRedraw = setTimeout(aiki.redraw, 150)
      }

    , redo: function() {
        if (!aiki.redoStack.length) return
        aiki.runAndSave(aiki.redoStack.pop())
      }

      // “Eyedropper” functionality
    , pickColorFromImage: function() {
        var pix = aiki.cx.getImageData(aiki.mousePos.x, aiki.mousePos.y, 1, 1)
          , pd = pix.data
          , rgbstr = [pd[0], pd[1], pd[2]].join(',')
          , color = 'rgb('+rgbstr+')'

        aiki.runAndSave('c' + color)
      }

    , redraw: function() {
        var start = new Date()
          , cx = aiki.cx

        // Initialize some variables to their initial states.  Can’t
        // change these without changing the interpretation of past
        // drawings.
        aiki.pendingRedraw = null
        aiki.setOpacity(1.0)
        aiki.setPenSize(1)

        // Fill background with cream.  Assumes globalAlpha is already
        // 1.0.
        cx.fillStyle = '#E1B870'
        cx.fillRect(0, 0, aiki.cx.canvas.width, aiki.cx.canvas.height)

        // This variable gets initialized after filling in the
        // background so that filling the background doesn’t result in
        // strokes possibly showing up as cream (depending on whether
        // we use fillStyle; at the moment we don’t).
        aiki.setColor('black')

        cx.lineCap = 'round'
        cx.lineJoin = 'round'

        aiki.drawing.forEach(aiki.run)
        // Crudely measure performance.
        if (window.console) {
          console.log( 'aikidraw redraw for '+aiki.drawing.length
                     + ' commands took ms: '
                     + (new Date().getTime() - start.getTime())
                     )
        }
      }

    , runAndSave: function(command) {
        aiki.run(command)
        aiki.drawing.push(command)
      }

    , run: function(command) {
        var k = aiki.commandMap[command.charAt(0)]
        if (!k) throw new Error(command)
        aiki[k](command.substr(1))
      }

    , commandMap: { L: 'drawLine'
                  , c: 'setColor'
                  , s: 'setPenSize'
                  , a: 'setOpacity'
                  }

    , drawLine: function(args) {
        aiki.drawStroke(args.split(/ /))
      }

    , drawStroke: function(stroke) {
        var cx = aiki.cx
        cx.beginPath()

        cx.moveTo(stroke[0], stroke[1])
        for (var ii = 2; ii < stroke.length; ii += 2) {
          cx.lineTo(stroke[ii], stroke[ii+1])
        }

        cx.stroke()
      }

    , setColor: function(color) {
        aiki.cx.strokeStyle = aiki.cx.fillStyle = color
        aiki.updateColorDisplay()
      }

    , setPenSize: function(penSize) {
        aiki.cx.lineWidth = aiki.penSize = +penSize
        aiki.updateColorDisplay()
      }

    , setOpacity: function(opacity) {
        if (isNaN(+opacity)) opacity = 1.0
        aiki.opacity = aiki.cx.globalAlpha = +opacity
        aiki.updateColorDisplay()
      }

    , updateColorDisplay: function() {
        var cdjq = $('.colordisplay')
          , cd = cdjq[0]

        // This allows us to get .colordisplay size from CSS without
        // distorting the drawing in it.
        cd.width = cdjq.width()
        cd.height = cdjq.height()

        var cx = cd.getContext('2d')
          , ww = cd.width
          , hh = cd.height

        // Black and white background
        cx.globalAlpha = 1.0
        cx.fillStyle = 'black'
        cx.fillRect(0, 0, ww/2, hh)
        cx.fillStyle = 'white'
        cx.fillRect(ww/2, 0, ww/2, hh)

        // Draw a jaunty diagonal line

        cx.lineCap = 'round'
        cx.strokeStyle = aiki.cx.strokeStyle
        cx.lineWidth = aiki.cx.lineWidth
        cx.globalAlpha = aiki.opacity

        var mm = aiki.cx.lineWidth / 2 // minimal margin

        cx.beginPath()
        cx.moveTo(Math.max(ww/8, mm), Math.min(hh*3/4, hh-mm))
        cx.lineTo(Math.min(ww*7/8, ww-mm), Math.max(hh/4, mm))
        cx.stroke()
      }

    , saveDrawing: function() {
        localStorage.currentDrawing = JSON.stringify(aiki.drawing)
      }
    }

$(aiki.setup) // for some reason Firefox can't getElementById before DOMContentLoaded

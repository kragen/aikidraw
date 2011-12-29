// TODO:
// - Redraw with snapshots.  The imagedata being RGBA 8-bit means
//   512x512 is a meg of memory down the drain, so we probably don’t
//   want to save more than about 30 of those snapshots.  (Although
//   a PNG from .toDataURL() was only 215K.)
// - save redo stack persistently!
// - make lines long enough to be sensibly antialiased
// - make localStorage linear-time
// - add triangle/circle color picker
// - add keyboard shortcut: p for a palette
// - write a server-side so sketches can be shared
// - add timed replay
// - record delays for replay
// - display a moving colored translucent dot under the cursor
// - rename “command“s to “action“s? or “changes” or “deltas”?
//   Prevayler calls them “commands”...
// - do < > [ ] need to update the display of the current stroke?
// - get performance to be acceptable again in Firefox
// - make clicking (as opposed to dragging) make dots

var aiki =
    { drawPos: null
    , mousePos: { x: 0, y: 0 }
    , drawing: []
    , penSizes: [ 1, 2, 4, 8, 16, 32, 64, 128 ]
    , redoStack: []

    , setup: function() {
        var cv = $('#c')

        aiki.cx = cv[0].getContext('2d')
        aiki.invalidateColorDisplay =
          aiki.deferredUpdater( aiki.updateColorDisplay
                              , 50
                              )
        aiki.invalidateImage = aiki.deferredUpdater(aiki.redraw, 50)

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

    , drawWithStroke: function() {
        aiki.cx.putImageData(aiki.snapshot, 0, 0)
        aiki.drawStroke(aiki.currentStroke)
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

    , deferredUpdater: function(ff, tt) {
        var timeout = null
        var callback = function() {
              timeout = null
              ff()
            }
        var invoke = function() {
              if (timeout === null) timeout = setTimeout(callback, tt)
            }
        return invoke
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
        aiki.invalidateImage()
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
        aiki.setOpacity(1.0)
        aiki.setPenSize(1)

        // Fill background with cream.  Assumes globalAlpha is already
        // 1.0.
        cx.fillStyle = '#E1B870'
        cx.fillRect(0, 0, aiki.cx.canvas.width, aiki.cx.canvas.height)

        // This variable gets initialized after filling in the
        // background so that filling the background doesn’t result in
        // strokes possibly showing up as grey (depending on whether
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
        aiki.invalidateColorDisplay()
      }

    , setPenSize: function(penSize) {
        aiki.cx.lineWidth = aiki.penSize = +penSize
        aiki.invalidateColorDisplay()
      }

    , setOpacity: function(opacity) {
        if (isNaN(+opacity)) opacity = 1.0
        aiki.opacity = aiki.cx.globalAlpha = +opacity
        aiki.invalidateColorDisplay()
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

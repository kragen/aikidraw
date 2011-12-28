// TODO:
// D draw lines with mouse
// D fix it so it works in Firefox
// D store lines in localStorage
// D namespace everything
// - add multiple colors
// - add multiple thicknesses
// - make localStorage memory-efficient
// - make localStorage linear-time

var capo = { mousePos: null
           , cx: null
           , offsetTop: null
           , offsetLeft: null
           , drawing: []

           , setup: function() {
               var cv = $('#c')
                 , offset = cv.offset()

               capo.cx = cv[0].getContext('2d')
               capo.offsetTop = offset.top
               capo.offsetLeft = offset.left

               cv
               .mousedown(function(ev) { capo.mousePos = capo.evPos(ev) })
               .mouseup(function() { capo.mousePos = null })
               .mousemove(capo.mouseMoveHandler)

               capo.cx.strokeStyle = '1px solid black'

               var drawing = localStorage.getItem('currentDrawing')
               if (drawing) {
                 capo.drawing = JSON.parse(drawing)
                 capo.drawing.map(function(line) {
                   capo.drawLine(line[0], line[1])
                 })
               }
             }

           , mouseMoveHandler: function(ev) {
               if (capo.mousePos === null) {
                 return
               }

               var newPos = capo.evPos(ev)
               capo.addLine(capo.mousePos, newPos)
               capo.drawLine(capo.mousePos, newPos)
               capo.mousePos = newPos
             }

           , drawLine: function(oldPos, newPos) {
               var cx = capo.cx
               cx.moveTo(oldPos[0], oldPos[1])
               cx.lineTo(newPos[0], newPos[1])
               cx.stroke()
             }

           , addLine: function(oldPos, newPos) {
               capo.drawing.push([oldPos, newPos])
               localStorage.setItem('currentDrawing', JSON.stringify(capo.drawing))
             }

           , evPos: function(ev) {
               return [ev.pageX - capo.offsetLeft, ev.pageY - capo.offsetTop]
             }
           }

$(capo.setup) // for some reason Firefox can't getElementById before DOMContentLoaded

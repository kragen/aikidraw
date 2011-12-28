// TODO:
// D draw lines with mouse
// D fix it so it works in Firefox
// D store lines in localStorage
// - namespace everything
// - add multiple colors
// - add multiple thicknesses
// - make localStorage memory-efficient
// - make localStorage linear-time

$(setup) // for some reason Firefox can't getElementById before DOMContentLoaded

var mousePos = null
  , cx = null
  , offsetTop = null
  , offsetLeft = null
  , drawing = []

function setup() {
  var cv = $('#c')
    , offset = cv.offset()

  cx = cv[0].getContext('2d')
  offsetTop = offset.top
  offsetLeft = offset.left

  cv
  .mousedown(function(ev) { mousePos = evPos(ev) })
  .mouseup(function() { mousePos = null })
  .mousemove(mouseMoveHandler)

  cx.strokeStyle = '1px solid black'

  if (localStorage.getItem('currentDrawing')) {
    drawing = JSON.parse(localStorage.getItem('currentDrawing'))
    drawing.map(function(line) {
      drawLine(line[0], line[1])
    })
  }
}

function mouseMoveHandler(ev) {
  if (mousePos === null) {
    return
  }

  var newPos = evPos(ev)
  addLine(mousePos, newPos)
  drawLine(mousePos, newPos)
  mousePos = newPos
}

function drawLine(oldPos, newPos) {
  cx.moveTo(oldPos[0], oldPos[1])
  cx.lineTo(newPos[0], newPos[1])
  cx.stroke()
}

function addLine(oldPos, newPos) {
  drawing.push([oldPos, newPos])
  localStorage.setItem('currentDrawing', JSON.stringify(drawing))
}

function evPos(ev) {
  return [ev.pageX - offsetLeft, ev.pageY - offsetTop]
}
'use strict'

var search = document.getElementById('search')
search.value = window.localStorage.getItem('selected')

function getPlan() {
  var planReq = new XMLHttpRequest()
  planReq.onload = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(planReq.responseText)
      renderTables(data.tables[search.value])
    }
  }
  planReq.open('GET', '/plan.json?name=' + search.value, true)
  planReq.send()
}

function highlights() {
  var date = new Date()
  date.setHours(date.getHours() + 8)
  if (date.getDay() === 6) date.setHours(date.getHours() + 24)
  if (date.getDay() === 0) date.setHours(date.getHours() + 24)
  var onejan = new Date(date.getFullYear(), 0, 1)
  var week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7) % 2
  var day = date.getDay() - 1
  document.getElementById('plan-' + week).classList.add('thisweek')
  document.getElementById('table-' + week).childNodes.forEach(function(child) {
    child.childNodes[day].classList.add('today')
  })
}

function renderTables(tables) {

  for (var week = 0; week < tables.length; week++) {
    var max = 0
    for (var hr in tables[week]) {
      for (var day in tables[week][hr]) {
        if (tables[week][hr][day] !== "" && hr > max) max = hr
      }
    }

    var table = document.getElementById('table-' + week)
    table.innerHTML = '<tr><th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th></tr>'
    for (var hr = 0; hr < max; hr++) {
      var tr = document.createElement('tr')
      for (var day = 0; day < tables[week][hr].length; day++) {
        var td = document.createElement('td')
        td.innerHTML = tables[week][hr][day]
        tr.appendChild(td)
      }
      table.appendChild(tr)
    }
  }
  document.body.classList.remove('nodata')
  search.blur()

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(document.documentElement.outerHTML)
  }

  highlights()
}

if (document.body.classList.contains('nodata')) {
  if (search.value) {
    getPlan()
  }
} else {
  highlights()
}

var ac = {
  source: function(val, suggest) {
    var namesReq = new XMLHttpRequest()
    namesReq.onload = function() {
      if (this.readyState == 4 && this.status == 200) {
        suggest(JSON.parse(namesReq.responseText).names)
      }
    }
    namesReq.open('GET', '/names.json?name=' + val, true)
    namesReq.send()
  },
  minChars: 3,
  delay: 0,
  cache: 1,
  renderItem: function (item, search){
    // escape special characters
    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    var re = new RegExp('(' + search.split(' ').join('|') + ')', 'gi')
    return '<div class="autocomplete-suggestion" data-val="' + item + '">' + item.replace(re, '<span class="highlight">$1</span>') + '</div>'
  },
  onSelect: function(e, term, item){
    search.value = term
    window.localStorage.setItem('selected', search.value)
    getPlan()
  }
}

document.getElementById('clear').onclick = function clear() {
  search.value = ''
  search.focus()
}

document.getElementById('searchicon').onclick = function clear() {
  search.focus()
}

/*
  JavaScript autoComplete v1.0.4
  Copyright (c) 2014 Simon Steinberger / Pixabay
  GitHub: https://github.com/Pixabay/JavaScript-autoComplete
  License: http://www.opensource.org/licenses/mit-license.php
*/

function autoComplete(o){
  for (var k in o) {
    this[k] = ac[k]
  }

  function addEvent(el, type, handler){
    if (el.attachEvent) el.attachEvent('on'+type, handler); else el.addEventListener(type, handler)
  }
  function removeEvent(el, type, handler){
    // if (el.removeEventListener) not working in IE11
    if (el.detachEvent) el.detachEvent('on'+type, handler); else el.removeEventListener(type, handler)
  }
  function live(elClass, event, cb, context){
    addEvent(context || document, event, function(e){
      var found, el = e.target || e.srcElement
      while (el && !(found = el.classList.contains(elClass))) el = el.parentElement
      if (found) cb.call(el, e)
    })
  }

  var that = search

  // create suggestions container "sc"
  that.sc = document.createElement('div')
  that.sc.classList.add('autocomplete-suggestions')

  that.autocompleteAttr = that.getAttribute('autocomplete')
  that.setAttribute('autocomplete', 'off')
  that.cache = {}
  that.last_val = ''

  that.updateSC = function(resize, next){
    var rect = that.getBoundingClientRect()
    if (!resize) {
      that.sc.style.display = 'block'
      if (!that.sc.maxHeight) { that.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(that.sc, null) : that.sc.currentStyle).maxHeight); }
      if (!that.sc.suggestionHeight) that.sc.suggestionHeight = that.sc.querySelector('.autocomplete-suggestion').offsetHeight
      if (that.sc.suggestionHeight)
        if (!next) that.sc.scrollTop = 0
        else {
          var scrTop = that.sc.scrollTop, selTop = next.getBoundingClientRect().top - that.sc.getBoundingClientRect().top
          if (selTop + that.sc.suggestionHeight - that.sc.maxHeight > 0)
            that.sc.scrollTop = selTop + that.sc.suggestionHeight + scrTop - that.sc.maxHeight
          else if (selTop < 0)
            that.sc.scrollTop = selTop + scrTop
        }
    }
  }
  addEvent(window, 'resize', that.updateSC)
  document.body.appendChild(that.sc)

  live('autocomplete-suggestion', 'mouseleave', function(e){
    var sel = that.sc.querySelector('.autocomplete-suggestion.selected')
    if (sel) setTimeout(function(){ sel.classList.remove('selected'); }, 20)
  }, that.sc)

  live('autocomplete-suggestion', 'mouseover', function(e){
    var sel = that.sc.querySelector('.autocomplete-suggestion.selected')
    if (sel) sel.classList.remove('selected')
    this.classList.add('selected')
  }, that.sc)

  live('autocomplete-suggestion', 'mousedown', function(e){
    if (this.classList.contains('autocomplete-suggestion')) { // else outside click
      var v = this.getAttribute('data-val')
      that.value = v
      ac.onSelect(e, v, this)
      that.sc.style.display = 'none'
    }
  }, that.sc)

  var suggest = function(data){
    var val = that.value
    that.cache[val] = data
    if (data.length && val.length >= ac.minChars) {
      var s = ''
      for (var i=0;i<data.length;i++) s += ac.renderItem(data[i], val)
      that.sc.innerHTML = s
      that.updateSC(0)
    }
    else
      that.sc.style.display = 'none'
  }

  that.keydownHandler = function(e){
    var key = window.event ? e.keyCode : e.which
    // down (40), up (38)
    if (key == 9) {
      e.preventDefault()
      key = 40
    }
    if ((key == 40 || key == 38) && that.sc.innerHTML) {
      var next, sel = that.sc.querySelector('.autocomplete-suggestion.selected')
      if (!sel) {
        next = (key == 40) ? that.sc.querySelector('.autocomplete-suggestion') : that.sc.childNodes[that.sc.childNodes.length - 1]; // first : last
        next.classList.add('selected')
      } else {
        next = (key == 40) ? sel.nextSibling : sel.previousSibling
        if (next) {
          sel.classList.remove('selected')
          next.classList.add('selected')
        }
        else { sel.classList.remove('selected'); that.value = that.last_val; next = 0; }
      }
      that.updateSC(0, next)
      return false
    }
    // esc
    else if (key == 27) { that.value = that.last_val; that.sc.style.display = 'none'; }
    // enter
    else if (key == 13 || key == 9) {
      var sel = that.sc.querySelector('.autocomplete-suggestion.selected')
      if (sel && that.sc.style.display != 'none') { ac.onSelect(e, sel.getAttribute('data-val'), sel); setTimeout(function(){ that.sc.style.display = 'none'; }, 20); }
    }
  }
  addEvent(that, 'keydown', that.keydownHandler)

  that.keyupHandler = function(e){
    var key = window.event ? e.keyCode : e.which
    if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
      var val = that.value
      if (val.length >= ac.minChars) {
        if (val != that.last_val) {
          that.last_val = val
          clearTimeout(that.timer)
          if (ac.cache) {
            if (val in that.cache) { suggest(that.cache[val]); return; }
            // no requests if previous suggestions were empty
            for (var i=1; i<val.length-ac.minChars; i++) {
              var part = val.slice(0, val.length-i)
              if (part in that.cache && !that.cache[part].length) { suggest([]); return; }
            }
          }
          that.timer = setTimeout(function(){ ac.source(val, suggest) }, ac.delay)
        }
      } else {
        that.last_val = val
        that.sc.style.display = 'none'
      }
    }
  }
  addEvent(that, 'keyup', that.keyupHandler)

  that.focusHandler = function(e){
    that.last_val = '\n'
    that.keyupHandler(e)
  }
  if (!ac.minChars) addEvent(that, 'focus', that.focusHandler)
  
}

autoComplete()

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', {
    scope: './'
  })

  navigator.serviceWorker.onmessage = function(evt) {
    var data = JSON.parse(evt.data)
    renderTables(data.tables[search.value])
  }
}

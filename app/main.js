'use strict'

/* fck jqry */

const id = document.getElementById.bind(document)

/* better uglifying */

const body = document.body
const localStorage = window.localStorage
const sw = navigator.serviceWorker

/* definitions */

let search = id('search')
let date = new Date()
let weekShift = 0
let plan = []

let ac = {
  source: function(val, suggest) {
    fetch('names.json?name=' + val).then(function(resp) {
      return resp.json()
    }).then(function(data) {
      suggest(data.names)
    })
  },
  minChars: 3,
  delay: 0,
  cache: 1,
  renderItem: function (item, search){
    // escape special characters
    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    let re = new RegExp('(' + search.split(' ').join('|') + ')', 'gi')
    return '<div class="ac-s" data-val="' + item + '">' + item.replace(re, '<span class="hl">$1</span>') + '</div>'
  },
  onSelect: function(e, term, item){
    body.classList.remove('typing')
    search.value = term
    localStorage.setItem('selected', search.value)
    fetch('plan.json?name=' + search.value).then(function(resp) {
      return resp.json()
    }).then(function(data) {
      renderPlan(data)
    })
  }
}

/* actions */

search.value = localStorage.getItem('selected')

if (body.classList.contains('nodata')) {
  if (search.value) {
    fetch('plan.json?name=' + search.value).then(function(resp) {
      return resp.json()
    }).then(function(data) {
      renderPlan(data)
    })
  } else {
    search.focus()
  }
} else {
  highlights()
  fetch('plan.json?name=' + search.value)
}

if (!navigator.onLine) body.classList.add('offline')

/* events */

id('clear').onclick = function clear() {
  search.value = ''
  search.focus()
}

id('searchicon').onclick = function clear() {
  search.focus()
}

search.onblur = function() {
  body.classList.remove('typing')
}

addEvent(window, 'online', function () {
  body.classList.remove('offline')
})

addEvent(window, 'offline', function () {
  body.classList.add('offline')
})

addEvent(id('lastweek'), 'click', function () {
  weekShift++
  highlights()
})

addEvent(id('nextweek'), 'click', function () {
  weekShift++
  highlights()
})

/* functions */

function highlights() {
  date = new Date()
  date.setHours(date.getHours() + 8)
  if (date.getDay() === 6) date.setHours(date.getHours() + 24)
  if (date.getDay() === 0) date.setHours(date.getHours() + 24)
  let onejan = new Date(date.getFullYear(), 0, 1)
  let week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7) % 2
  let day = date.getDay() - 1
  id('table-' + week).childNodes.forEach(function(child) {
    child.childNodes[day+1].classList.add('today')
  })
  date.setDate(date.getDate() + weekShift * 7)
  onejan = new Date(date.getFullYear(), 0, 1)
  week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7) % 2
  id('plan-' + week).classList.add('thisweek')
  id('plan-' + ((week+1)%2)).classList.remove('thisweek')
}

function renderPlan(data) {
  let tables = data.tables[search.value] || []

  for (let week = 0; week < tables.length; week++) {
    let max = 0
    for (let hr in tables[week]) {
      for (let day in tables[week][hr]) {
        if (tables[week][hr][day] !== '' && hr > max) max = hr
      }
    }
    max++

    let table = id('table-' + week)
    table.innerHTML = '<tr><th class="hour"></th><th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th></tr>'
    for (let hr = 0; hr < max; hr++) {
      let tr = document.createElement('tr')
      let hour = document.createElement('td')
      hour.classList.add('hour')
      hour.innerHTML = hr+1
      tr.appendChild(hour)
      for (let day = 0; day < tables[week][hr].length; day++) {
        let td = document.createElement('td')
        td.innerHTML = tables[week][hr][day]
        tr.appendChild(td)
      }
      table.appendChild(tr)
    }
  }

  id('plan-lastupdate').innerHTML = formatDate(new Date(data.date))
  body.classList.remove('nodata')
  search.blur()
 
  id('ac-ss').innerHTML = ''

  if (sw && sw.controller) {
    sw.controller.postMessage(JSON.stringify({
      type: 'prerender',
      content: document.documentElement.outerHTML
    }))
  }

  highlights()
}

function pad(string, amount) {
  return Array(amount).join('0').substr(0, amount - String(string).length) + string
}

function formatDate(date) {
  return '' + pad(date.getDate(), 2) + '.' + pad(date.getMonth()+1, 2) + '.' +  date.getFullYear() + ' um ' + date.getHours() + ':' + pad(date.getMinutes(), 2) + ' Uhr'
}

function addEvent(el, type, handler){
  el.addEventListener(type, handler)
}

function removeEvent(el, type, handler){
  el.removeEventListener(type, handler)
}

/*
  Based on JavaScript autoComplete v1.0.4
  Copyright (c) 2014 Simon Steinberger / Pixabay
  Copyright (c) 2017-2018 PetaByteBoy
  GitHub: https://github.com/Pixabay/JavaScript-autoComplete
  License: http://www.opensource.org/licenses/mit-license.php
*/

function addEventToSuggestions(event, cb){
  addEvent(id('ac-ss'), event, function(e){
    let found, el = e.target || e.srcElement
    while (el && !(found = el.classList.contains('ac-s'))) el = el.parentElement
    if (found) cb.call(el, e)
  })
}

search.cache = {}
search.last_val = ''
body.appendChild(id('ac-ss'))

addEventToSuggestions('mouseleave', function(e){
  let sel = id('ac-ss').querySelector('.ac-s.s')
  if (sel) setTimeout(function(){ sel.classList.remove('s'); }, 20)
})

addEventToSuggestions('mouseover', function(e){
  let sel = id('ac-ss').querySelector('.ac-s.s')
  if (sel) sel.classList.remove('s')
  this.classList.add('s')
})

addEventToSuggestions('mousedown', function(e){
  if (this.classList.contains('ac-s')) { // else outside click
    let v = this.getAttribute('data-val')
    search.value = v
    ac.onSelect(e, v, this)
  }
})

function suggest(data){
  let val = search.value
  search.cache[val] = data
  if (data.length && val.length >= ac.minChars) {
    let s = ''
    for (let i=0;i<data.length;i++) s += ac.renderItem(data[i], val)
    id('ac-ss').innerHTML = s
    body.classList.add('typing')
  }
  else
    id('ac-ss').innerHTML = ''
}

addEvent(search, 'keydown', function(e){
  let key = window.event ? e.keyCode : e.which
  // down (40), up (38)
  if (key == 9) {
    e.preventDefault()
    key = 40
  }
  if ((key == 40 || key == 38) && id('ac-ss').innerHTML) {
    let next, sel = id('ac-ss').querySelector('.ac-s.s')
    if (!sel) {
      next = (key == 40) ? id('ac-ss').querySelector('.ac-s') : id('ac-ss').childNodes[id('ac-ss').childNodes.length - 1] // first : last
      next.classList.add('s')
    } else {
      next = (key == 40) ? sel.nextSibling : sel.previousSibling
      if (next) {
        sel.classList.remove('s')
        next.classList.add('s')
      }
      else { sel.classList.remove('s'); search.value = search.last_val; next = 0; }
    }
    body.classList.add('typing')

    return false
  }
  // esc
  else if (key == 27) { search.value = search.last_val; search.blur(); }
  // enter
  else if (key == 13 || key == 9) {
    if (body.classList.contains('typing')) {
      let sel = id('ac-ss').querySelector('.ac-s.s') || id('ac-ss').firstChild
      ac.onSelect(e, sel.getAttribute('data-val'), sel)
    }
  }
})

addEvent(search, 'keyup', function(e){
  let key = window.event ? e.keyCode : e.which
  if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
    let val = search.value
    if (val.length >= ac.minChars) {
      if (val != search.last_val) {
        search.last_val = val
        clearTimeout(search.timer)
        if (ac.cache) {
          if (val in search.cache) { suggest(search.cache[val]); return; }
          // no requests if previous ss were empty
          for (let i=1; i<val.length-ac.minChars; i++) {
            let part = val.slice(0, val.length-i)
            if (part in search.cache && !search.cache[part].length) { suggest([]); return; }
          }
        }
        search.timer = setTimeout(function(){ ac.source(val, suggest) }, ac.delay)
      }
    } else {
      search.last_val = val
      body.classList.remove('typing')
    }
  }
})

if (!ac.minChars) {
  addEvent(search, 'focus', function(e){
    search.last_val = '\n'
    search.keyupHandler(e)
  })
}
  
// sw

if ('serviceWorker' in navigator) {
  sw.register('sw.js', {
    scope: './'
  })

  sw.onmessage = function(evt) {
    let data = JSON.parse(evt.data)
    renderPlan(data)
  }
}

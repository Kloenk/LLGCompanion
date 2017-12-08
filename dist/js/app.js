'use strict'

var data, dsb

var date = new Date()
date.setHours(date.getHours() + 8)
if (date.getDay() === 6) date.setHours(date.getHours() + 24)
if (date.getDay() === 0) date.setHours(date.getHours() + 24)

var onejan = new Date(date.getFullYear(), 0, 1)
var week = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7)

function setData(data, update) {
  var headers = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

  if (week % 2 === 0) {
    setWeekData(0, data[0], headers, date.getDay() - 1, true)
    setWeekData(1, data[1], headers, date.getDay() - 1, false)
  } else {
    setWeekData(0, data[1], headers, date.getDay() - 1, true)
    setWeekData(1, data[0], headers, date.getDay() - 1, false)
  }

  document.getElementById('content').style.display = 'block'
  document.getElementById('fail').style.display = 'none'
}

function setWeekData(abweek, data, headers, day, thisweek) {
  var table = document.getElementById('table-' + abweek)
  table.innerHtml = ''

  var max = 0
  for (var key1 in data) {
    var row = data[key1]
    for (var key2 in row) {
      if (row[key2] !== '' && key1 > max) max = key1
    }
  }

  var headersObj = document.createElement('tr').append
  table.appendChild(headersObj)
  for (var key in headers) {
    var item = headers[key]
    var obj = document.createElement('th').html(item)
    if (key == day && thisweek) obj.attr('class', 'today')
    headersObj.appendChild(obj)
  }

  for (var i = 0; i < 5; i++) {
    document.getElementById('day-' + abweek + '-' + i).empty()
  }

  for (var key1 = 0; key1 <= max; key1++) {
    var row = data[key1]
    var rowObj = document.createElement('tr')
    table.appendChild(rowObj)
    for (var key2 = 0; key2 < 5; key2++) {
      var item = row[key2]
      var obj = document.createElement('td').html(item)
      if (key2 == day && thisweek) obj.attr('class', 'today')
      rowObj.appendChild(obj)
      document.getElementById('day-' + abweek + '-' + key2).appendChild(document.createElement('div').html(item))
    }
  }
}

document.getElementById('search').onfocus = function(evt) {
  document.getElementById('content').style.display = 'none'
}
document.getElementById('clear').onclick = function(evt) {
  document.getElementById('search').value = ''
  document.getElementById('search').focus()
}

var selected = localStorage.getItem('selected')
if (!selected) {
  document.getElementById('fail').style.display = 'block'
  document.getElementById('search').focus()
}

function updateData(update) {
  var index = Object.keys(data).reduce(function(acc, cur, i) {
    acc[cur] = null
    return acc
  }, {})

  if (selected && selected in data) {
    document.getElementById('search').value = selected
    setData(data[selected], update)
  } else {
    document.getElementById('fail').style.display = 'block'
    document.getElementById('search').focus()
  }
}

var request = new XMLHttpRequest();
request.open('GET', './dsb.json', true);
request.onload = function() {
  if (request.status >= 200 && request.status < 400) {
    dsb = JSON.parse(request.responseText);
    if (dsb) updateData(true)
  }
}
var request = new XMLHttpRequest();
request.open('GET', './plan.json?name=S', true);
request.onload = function() {
  if (request.status >= 200 && request.status < 400) {
    data = JSON.parse(request.responseText);
    if (data) updateData(true)
    new autoComplete({
      selector: 'input',
      source: data,
      minChars: 3,
      delay: 0,
      cache: 1,
      menuClass: 'menu',
      renderItem: function (item, search){
        // escape special characters
        search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
        return '<div class="autocomplete-suggestion" data-val="' + item + '">' + item.replace(re, "<b>$1</b>") + '</div>';
      },
      onSelect: function(e, term, item){}
    })
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', {
    scope: './'
  })

  navigator.serviceWorker.onmessage = function(evt) {
    var msg = JSON.parse(evt.data)
    if (msg.type === 'planinfo') {
      data = JSON.parse(msg.data)
      updateData(true)
    } else if (msg.type === 'dsb') {
      data = JSON.parse(msg.data)
      updateData(true)

    }
  }
}






function autoComplete(o){
  if (!document.querySelector) return;

  // helpers
  function hasClass(el, className){ return el.classList ? el.classList.contains(className) : new RegExp('\\b'+ className+'\\b').test(el.className); }

  function addEvent(el, type, handler){
    if (el.attachEvent) el.attachEvent('on'+type, handler); else el.addEventListener(type, handler);
  }
  function removeEvent(el, type, handler){
    // if (el.removeEventListener) not working in IE11
    if (el.detachEvent) el.detachEvent('on'+type, handler); else el.removeEventListener(type, handler);
  }
  function live(elClass, event, cb, context){
    addEvent(context || document, event, function(e){
      var found, el = e.target || e.srcElement;
      while (el && !(found = hasClass(el, elClass))) el = el.parentElement;
      if (found) cb.call(el, e);
    });
  }

  // init
  var elems = typeof o.selector == 'object' ? [o.selector] : document.querySelectorAll(o.selector);
  for (var i=0; i<elems.length; i++) {
    var that = elems[i];

    // create suggestions container "sc"
    that.sc = document.createElement('div');
    that.sc.className = 'autocomplete-suggestions '+o.menuClass;

    that.autocompleteAttr = that.getAttribute('autocomplete');
    that.setAttribute('autocomplete', 'off');
    that.cache = {};
    that.last_val = '';

    that.updateSC = function(resize, next){
      var rect = that.getBoundingClientRect();
      if (!resize) {
        that.sc.style.display = 'block';
        if (!that.sc.maxHeight) { that.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(that.sc, null) : that.sc.currentStyle).maxHeight); }
        if (!that.sc.suggestionHeight) that.sc.suggestionHeight = that.sc.querySelector('.autocomplete-suggestion').offsetHeight;
        if (that.sc.suggestionHeight)
          if (!next) that.sc.scrollTop = 0;
          else {
            var scrTop = that.sc.scrollTop, selTop = next.getBoundingClientRect().top - that.sc.getBoundingClientRect().top;
            if (selTop + that.sc.suggestionHeight - that.sc.maxHeight > 0)
              that.sc.scrollTop = selTop + that.sc.suggestionHeight + scrTop - that.sc.maxHeight;
            else if (selTop < 0)
              that.sc.scrollTop = selTop + scrTop;
          }
      }
    }
    addEvent(window, 'resize', that.updateSC);
    document.body.appendChild(that.sc);

    live('autocomplete-suggestion', 'mouseleave', function(e){
      var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
      if (sel) setTimeout(function(){ sel.className = sel.className.replace('selected', ''); }, 20);
    }, that.sc);

    live('autocomplete-suggestion', 'mouseover', function(e){
      var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
      if (sel) sel.className = sel.className.replace('selected', '');
      this.className += ' selected';
    }, that.sc);

    live('autocomplete-suggestion', 'mousedown', function(e){
      if (hasClass(this, 'autocomplete-suggestion')) { // else outside click
        var v = this.getAttribute('data-val');
        that.value = v;
        o.onSelect(e, v, this);
        that.sc.style.display = 'none';
      }
    }, that.sc);

    that.blurHandler = function(){
      try { var over_sb = document.querySelector('.autocomplete-suggestions:hover'); } catch(e){ var over_sb = 0; }
      if (!over_sb) {
        that.last_val = that.value;
        that.sc.style.display = 'none';
        setTimeout(function(){ that.sc.style.display = 'none'; }, 350); // hide suggestions on fast input
      } else if (that !== document.activeElement) setTimeout(function(){ that.focus(); }, 20);
    };
    addEvent(that, 'blur', that.blurHandler);

    var suggest = function(data){
      var val = that.value;
      that.cache[val] = data;
      if (data.length && val.length >= o.minChars) {
        var s = '';
        for (var i=0;i<data.length;i++) s += o.renderItem(data[i], val);
        that.sc.innerHTML = s;
        that.updateSC(0);
      }
      else
        that.sc.style.display = 'none';
    }

    that.keydownHandler = function(e){
      var key = window.event ? e.keyCode : e.which;
      // down (40), up (38)
      if ((key == 40 || key == 38) && that.sc.innerHTML) {
        var next, sel = that.sc.querySelector('.autocomplete-suggestion.selected');
        if (!sel) {
          next = (key == 40) ? that.sc.querySelector('.autocomplete-suggestion') : that.sc.childNodes[that.sc.childNodes.length - 1]; // first : last
          next.className += ' selected';
          that.value = next.getAttribute('data-val');
        } else {
          next = (key == 40) ? sel.nextSibling : sel.previousSibling;
          if (next) {
            sel.className = sel.className.replace('selected', '');
            next.className += ' selected';
            that.value = next.getAttribute('data-val');
          }
          else { sel.className = sel.className.replace('selected', ''); that.value = that.last_val; next = 0; }
        }
        that.updateSC(0, next);
        return false;
      }
      // esc
      else if (key == 27) { that.value = that.last_val; that.sc.style.display = 'none'; }
      // enter
      else if (key == 13 || key == 9) {
        var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
        if (sel && that.sc.style.display != 'none') { o.onSelect(e, sel.getAttribute('data-val'), sel); setTimeout(function(){ that.sc.style.display = 'none'; }, 20); }
      }
    };
    addEvent(that, 'keydown', that.keydownHandler);

    that.keyupHandler = function(e){
      var key = window.event ? e.keyCode : e.which;
      if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
        var val = that.value;
        if (val.length >= o.minChars) {
          if (val != that.last_val) {
            that.last_val = val;
            clearTimeout(that.timer);
            if (o.cache) {
              if (val in that.cache) { suggest(that.cache[val]); return; }
              // no requests if previous suggestions were empty
              for (var i=1; i<val.length-o.minChars; i++) {
                var part = val.slice(0, val.length-i);
                if (part in that.cache && !that.cache[part].length) { suggest([]); return; }
              }
            }
            that.timer = setTimeout(function(){ o.source(val, suggest) }, o.delay);
          }
        } else {
          that.last_val = val;
          that.sc.style.display = 'none';
        }
      }
    };
    addEvent(that, 'keyup', that.keyupHandler);

    that.focusHandler = function(e){
      that.last_val = '\n';
      that.keyupHandler(e)
    };
    if (!o.minChars) addEvent(that, 'focus', that.focusHandler);
  }
}


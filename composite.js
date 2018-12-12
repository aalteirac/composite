define([
	'jquery',
	'qlik',
	'./properties',
	'./interact',
	'css!./css/styles.css'
],
function ($, qlik, props,interact, cssContent) {
	var painted=false;
	var btn;
	var	app = qlik.currApp(this);
	const obKey = 'obj';
	var TEMPLATE = {
		MASK: '<div class="qvobject mask viz-without-export"></div>',
		QVOBJECT: '<div class="qvobject obj viz-without-export"></div>',
		EXTENSION: '<div qv-extension class="composite"></div>',
	};

	function getId(id,obid,chid,opt){
		return id +'-'+obid +'-'+chid+'-'+opt.noInteraction+"-"+opt.noSelections+"-"+opt.pix;
	}
	function renderObject(id,objId,chartId, options) {
		var objContainer = $(TEMPLATE.QVOBJECT);
		var mask=$(TEMPLATE.MASK);
		objContainer.attr('obid', getId(id,objId,chartId,options));
		mask.attr('obid', getId(id,objId,chartId,options));
		objContainer.attr('chart-id', chartId);
		mask.attr('chart-id', chartId);
		objContainer.attr('obj-id', objId);
		mask.attr('obj-id', objId);
		app.getObject(objContainer,chartId, options);
		return [mask,objContainer];
	}

	function save(me,layout){
		me.backendApi.getProperties().then(function(reply){
			reply.props=layout.props;
			me.backendApi.setProperties(reply);
		})
	}


	return {
		initialProperties: {
			version : 1.0,
			activeTab: 1
		},
		definition: props,
		support: {
			export: false,
			exportData: false,
			snapshot: false
		},
		beforeDestroy: function () {
			currActiveTab = null;

			if (btn) {
				btn.off();
				btn.remove();
				btn = null;
			}
		},
		paint: function ($element, layout) {
			var self = this;
			var id = layout.qInfo.qId;
			var props = layout.props;
			var extElem = $(TEMPLATE.EXTENSION);
			var mode=qlik.navigation.getMode();
			extElem.attr("id",id);
			function setDragResize(id,obKey,chartId,objectOptions){
				interact(`.mask[obid='${getId(id,obKey,chartId,objectOptions)}']`).draggable({
					snap: {
						targets: [
						  interact.createSnapGrid({ x: 5, y: 5 })
						],
						range: Infinity,
						relativePoints: [ { x: 0, y: 0 } ]
					  },
					  inertia: true,
					  restrict: {
						restriction: $element[0],
						elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
						endOnly: true
					  },
					onmove(event) {
						var target = event.target,
						x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
						y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
						target.style.webkitTransform =
						target.style.transform ='translate(' + x + 'px, ' + y + 'px)';
						target.setAttribute('data-x', x);
						target.setAttribute('data-y', y);
						$(`.obj[obid='${target.getAttribute("obid")}']`).css('transform','translate(' + x + 'px, ' + y + 'px)')
					},
					onend(event) {
						var x=parseInt(event.target.getAttribute('data-x'));
						var y=parseInt(event.target.getAttribute('data-y'));
						var rx=x/$element.width();
						var ry=y/$element.height();
						layout.props[event.target.getAttribute("obj-id")].coord=rx+"#"+ry;
						layout.props[event.target.getAttribute("obj-id")].rawCoord=x+"#"+y;
						save(self,layout)
					}
				})
				.resizable({
					edges: { left:true, right: true, bottom: true, top:true},
					restrictEdges: {
					outer: $element[0],
					endOnly: true,
					},
					restrictSize: {
					min: { width: 20, height: 20 },
					},		
					inertia: true,
				})
				.on('resizemove', function (event) {
					var target = event.target,
						x = (parseFloat(target.getAttribute('data-x')) || 0),
						y = (parseFloat(target.getAttribute('data-y')) || 0);
						// translate when resizing from top or left edges
					target.style.width  = event.rect.width + 'px';
					target.style.height = event.rect.height + 'px';
					x += event.deltaRect.left;
					y += event.deltaRect.top;
					target.style.webkitTransform = target.style.transform ='translate(' + x + 'px,' + y + 'px)';
					target.setAttribute('data-x', x);
					target.setAttribute('data-y', y);
					$(`.obj[obid='${target.getAttribute("obid")}']`).css('transform','translate(' + x + 'px,' + y + 'px)');
					$(`.obj[obid='${target.getAttribute("obid")}']`).css('width',target.style.width).css('height',target.style.height);
					
				}).on('resizeend', function (event) {
					var target = event.target,
						x = (parseFloat(target.getAttribute('data-x')) || 0),
						y = (parseFloat(target.getAttribute('data-y')) || 0);
					var w=$(target).width();
					var h=$(target).height();
					var rw=$(target).width()/$element.width();
					var rh=$(target).height()/$element.height();
					var rx=x/$element.width();
					var ry=y/$element.height();
					layout.props[event.target.getAttribute("obj-id")].coord=rx+"#"+ry;
					layout.props[event.target.getAttribute("obj-id")].rawCoord=x+"#"+y;
					layout.props[event.target.getAttribute("obj-id")].size=rw+"#"+rh;
					layout.props[event.target.getAttribute("obj-id")].rawSize=w+"#"+h;
					save(self,layout)
					qlik.resize(`.obj[obid='${target.getAttribute("obid")}']`);
				});
			}
			if($("#"+id).length===0){
				$element.append(extElem);
			}
			for (var i = parseInt(props.objNumber)+1; i < props.maxObj; i++) {	//clean removed objects	
				$("#"+id).find(`.obj[obj-id='${obKey+i}']`).remove();
				$("#"+id).find(`.mask[obj-id='${obKey+i}']`).remove();
				layout.props[obKey+i].chart="";
				layout.props[obKey+i].coord="0#0";
				layout.props[obKey+i].rawCoord="0#0";
				layout.props[obKey+i].size="";
				layout.props[obKey+i].rawSize="";
				save(self,layout)
			}
			for (var i = 1; i <= props.objNumber; i++) {						//display objects
				var chartId = props[obKey+i].chart;
				var objectOptions = {
					'noInteraction': props[obKey+i].interact,
					'noSelections': props[obKey+i].select,
					'pix':props[obKey+i].pix
				};
				var uniqSelector=`[obid='${getId(id,obKey+i,chartId,objectOptions)}']`;
				var uniq=$(uniqSelector);
				if(uniq.length===0){											//new or changed object
					$("#"+id).find(`[obj-id='${obKey+i}']`).remove();
					$("#"+id).append(renderObject(id,obKey+i,chartId, objectOptions));
					if(!interact.isSet(`.mask[obid='${getId(id,obKey+i,chartId,objectOptions)}']`))
						setDragResize(id,obKey+i,chartId,objectOptions);
				}
				if(props[obKey+i].coord!=""){									//set object coordinates
					var x = $element.width() *  parseFloat(props[obKey+i].coord.split('#')[0]);
					var y =  $element.height() *  parseFloat(props[obKey+i].coord.split('#')[1]);
					if(layout.props[obKey+i].pix===true){
						x = parseFloat(props[obKey+i].rawCoord.split('#')[0]);
						y = parseFloat(props[obKey+i].rawCoord.split('#')[1]);
					}
					$("#"+id).find(uniqSelector).attr('data-x',x)
						.attr('data-y',y)
						.css('transform','translate(' + x + 'px, ' + y + 'px)');
				}
				if(props[obKey+i].size!=""){									//set object size
					var w = $element.width() * parseFloat(props[obKey+i].size.split('#')[0]);
					var h = $element.height() * parseFloat(props[obKey+i].size.split('#')[1]);
					if(layout.props[obKey+i].pix===true){
						w = parseFloat(props[obKey+i].rawSize.split('#')[0]);
						h = parseFloat(props[obKey+i].rawSize.split('#')[1]);
					}
					$("#"+id).find(uniqSelector).css('width',w).css('height',h)
				}
				else{															//default size
					var w=$("#"+id).find(uniqSelector).width();
					var h=$("#"+id).find(uniqSelector).height();
					var rw=$("#"+id).find(uniqSelector).width()/$element.width();
					var rh=$("#"+id).find(uniqSelector).height()/$element.height();
					layout.props[obKey+i].size=rw+"#"+rh;
					layout.props[obKey+i].rawSize=w+"#"+h;
					save(self,layout);
				}
				$('.mask').hide();
				if(mode==='edit')												//enable drag and size in edit mode
					$('.mask').show();
			}
            
            function decimalToHex(d, padding) {
				var hex = Number(d).toString(16);
				padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

				while (hex.length < padding) {
					hex = "0" + hex;
				}

				return hex;
			}

			var BackgroundTrans = layout.background.transparency;

			function hexToRgb(hex) {
				var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
				return result ? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16)
				} : null;
			}

			var RGBAString = 'rgba(' + hexToRgb(layout.background.color).r + ',' + hexToRgb(layout.background.color).g  + ',' + hexToRgb(layout.background.color).b  + ',' + BackgroundTrans +')';

			$(document).ready(function () {
				console.log("ready");
				console.log("Try to write background with color: " + RGBAString);
				$("#"+id).css('background-color',RGBAString);
				//var parentElement = $element[0].parentElement.parentElement.parentElement.parentElement.parentElement;
				//$(parentElement).css("visibility","hidden");
			});

          	if (layout.DebugMode == undefined) {
            	var debugmode = false;
          	} else {
            	var debugmode = layout.DebugMode;
          	}
          	if (debugmode == true) {
           		logger.enableLogger();
          	} else {
            	logger.disableLogger();
          	}
		}
	};
});
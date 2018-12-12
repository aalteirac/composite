"use strict"
define(["qlik"], function (qlik) {
    var app = qlik.currApp(this),
        permission = null,
        masterObjectPromise;
    var masterobjects;
    const MAXOBJ=10;

    function getItems(){
        var im={
            dropdown: {
                ref: "props.objNumber",
                type: "string",
                label: function (data) {
                    return 'Layer Number ('+data.props.objNumber+' on '+MAXOBJ+')';
                },
                defaultValue: "1",
                component: "slider",
                min: 1,
                max: MAXOBJ,
                step: 1
            },
            maxO:{
                ref:  "props.maxObj",
                type: "number",
                defaultValue: MAXOBJ,
                show:false
            }
        }
        for (let i = 1; i <= MAXOBJ; i++) {
            im['obj'+i]=
                {
                    type: "items",
                    label: function (data) {
                        return data.props["obj"+i].label;
                    },
                    show: function (data) {
                        return data.props.objNumber >= i;//BUG DESKTOP
                    },
                    items: generateItemObject(i)
                }
        }
        return im;
    }
    function exportAllowed() {
        if (!permission) {
            return app.getAppLayout().then(function (result) {
                permission = result.layout.permissions.exportData;
                return permission;
            });
        } else {
            setTimeout(function () {
                permission = null;
            }, 1000);
            return permission;
        }
    }

    function getMasterObjectList () {
        if (!masterObjectPromise) {
            var defer = qlik.Promise.defer();
            app.getAppObjectList('masterobject', function (data) {
                masterobjects = data.qAppObjectList.qItems.map(function (item) {
                    return {
                        value: item.qInfo.qId,
                        label: item.qMeta.title
                    };
                });
                return defer.resolve(masterobjects);
            });
            masterObjectPromise = defer.promise;
        }
        return masterObjectPromise;
    }

    function generateItemObject(nbr) {

        return {
            obj: {
                component: "header",
                label: "Layer " + nbr
            },
            chart: {
                ref: "props.obj" + nbr + ".chart",
                type: "string",
                component: "dropdown",
                label: "Master Object",
                defaultValue: "",
                options: function () { 
                    if (masterobjects) {
                        return masterobjects;
                    }
                    return getMasterObjectList();
                }
            },
            export: {
                ref: "props.obj" + nbr + ".export",
                type: "boolean",
                label: "Enable export",
                defaultValue: false,
                show: function (data) {
                    return false;
                    //return data.props["obj" + nbr].chart !== "" && exportAllowed();
                }
            },
            responsive: {
                ref: "props.obj" + nbr + ".pix",
                type: "boolean",
                label: "Disable Responsive",
                defaultValue: false,
                show: function (data) {
                    return data.props["obj" + nbr].chart !== "";
                }
            },
            interaction: {
                ref: "props.obj" + nbr + ".interact",
                type: "boolean",
                label: "Disable Interaction",
                defaultValue: false,
                show: function (data) {
                    return data.props["obj" + nbr].chart !== "" ;
                }
            },
            selection: {
                ref: "props.obj" + nbr + ".select",
                type: "boolean",
                label: "Disable Selection",
                defaultValue: false,
                show: function (data) {
                    return data.props["obj" + nbr].chart !== "" ;
                }
            },
            coord:{
                ref: "props.obj" + nbr + ".coord", 
                type: "string",
                label: "obj coord",
                defaultValue:"0#0",
                show: false
            },
            rawCoord:{
                ref: "props.obj" + nbr + ".rawCoord", 
                type: "string",
                label: "obj coord",
                defaultValue:"0#0",
                show: false
            },
            size:{
                ref: "props.obj" + nbr + ".size", 
                type: "string",
                label: "obj size",
                show:false
            },
            rawSize:{
                ref: "props.obj" + nbr + ".rawSize", 
                type: "string",
                label: "obj size",
                show:false
            }
        };
    }

    var settings = {
        uses: "settings",
        items: {
            general: {
                items: {
                  showTitles: {
                        defaultValue: false
                  }
            },
            landingpage: {
                type: "items",
                label: "Background Info",
                ref: "BackgroundInfo",
                items: {
                  background_transparency: {
                    ref: "background.transparency",
                    label: "transparency",
                    type: "string",
                    expression: "optional"
                  },
                  background_color: {
                    ref: "background.color",
                    label: "Background Hex Color",
                    type: "string",
                    expression: "optional"
                  }
                }
              }
            },
            selections: {
                show: false
            },
            objs: {
                grouped: false,
                type: "items",
                label: "Layers",
                items: getItems()
            }
        }
    };


    return {
        type: "items",
        component: "accordion",
        items: {
            settings: settings
        }
    };
});

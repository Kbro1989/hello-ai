var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import * as React from "react";
import { JsonDisplay, IdInput, IdInputSearch, LabeledInput, InputCommitted, StringInput, TabStrip, CopyButton, PasteButton } from "./commoncontrols";
import { ThreejsSceneCache, EngineCache, constModelsIds } from '../3d/modeltothree';
import { delay, packedHSL2HSL, HSL2RGB, RGB2HSL, HSL2packHSL, stringToFileRange, stringToMapArea, checkObject } from '../utils';
import { boundMethod } from 'autobind-decorator';
import { CombinedTileGrid, getTileHeight, rs2ChunkSize, classicChunkSize } from '../3d/mapsquare';
import { Euler, Quaternion, Vector3 } from "three";
import { cacheMajors } from "../constants";
import classNames from "classnames";
import { appearanceUrl, avatarStringToBytes, bytesToAvatarString, slotNames, slotToKitFemale, slotToKitMale, writeAvatar } from "../3d/avatar";
import { highlightModelGroup, exportThreeJsGltf, exportThreeJsStl } from "./threejsrender";
import { cacheFileJsonModes, cacheFileDecodeModes, cacheFileDecodeGroups } from "../scripts/filetypes";
import { defaultTestDecodeOpts, testDecode } from "../scripts/testdecode";
import { UIScriptOutput, OutputUI, useForceUpdate, VR360View, DomWrap } from "./scriptsui";
import { CacheSelector, downloadBlob, openSavedCache } from "./maincomponents";
import { tiledimensions } from "../3d/mapsquare";
import { runMapRender } from "../map";
import { diffCaches } from "../scripts/cachediff";
import { selectEntity, showModal } from "./jsonsearch";
import { drawTexture, findImageBounds, makeImageData } from "../imgutils";
import { Map2dView } from "../map/map2d";
function propOrDefault(v, defaults) {
    let r = Object.assign({}, defaults);
    if (typeof v == "object" && v) {
        for (let prop in defaults) {
            if (typeof v[prop] == typeof defaults[prop]) {
                r[prop] = v[prop];
            }
        }
    }
    return r;
}
export function ModelBrowser(p) {
    let [state, setMode] = React.useReducer((prev, v) => {
        localStorage.rsmv_lastmode = v;
        return { search: null, mode: v };
    }, null, () => {
        let search = null;
        try {
            search = JSON.parse(localStorage.rsmv_lastsearch ?? "");
        }
        catch (e) { }
        return { search, mode: localStorage.rsmv_lastmode };
    });
    const tabs = {
        item: "Item",
        npc: "Npc",
        object: "Loc",
        avatar: "Player",
        model: "Model",
        map: "Map",
        material: "Material",
        spotanim: "Spotanim",
        scenario: "Scenario",
        scripts: "Scripts"
    };
    let ModeComp = LookupModeComponentMap[state.mode];
    return (React.createElement(React.Fragment, null,
        React.createElement(TabStrip, { value: state.mode, tabs: tabs, onChange: setMode }),
        ModeComp && React.createElement(ModeComp, { initialId: state.search, ctx: p.ctx.canRender() ? p.ctx : null, partial: p.ctx })));
}
function ScenarioActionControl(p) {
    const action = p.action;
    let targetname = p.comp?.name ?? "??";
    let remove = React.createElement("input", { type: "button", className: "sub-btn", value: "x", onClick: () => p.onChange(null) });
    let gridstyle = (nparts) => ({
        display: "grid",
        gridTemplateColumns: (nparts <= 0 ? "1fr min-content" : `${nparts}fr repeat(${nparts},1fr) min-content`),
        alignItems: "baseline"
    });
    let spanstyle = { minWidth: "0", overflow: "hidden", whiteSpace: "nowrap" };
    switch (action.type) {
        case "anim": {
            return (React.createElement("div", { style: gridstyle(1) },
                React.createElement("span", { style: spanstyle },
                    p.action.type,
                    " ",
                    targetname),
                React.createElement(InputCommitted, { type: "number", value: action.animid, onChange: e => p.onChange({ ...action, animid: +e.currentTarget.value }) }),
                remove));
        }
        case "animset": {
            return (React.createElement("div", { style: gridstyle(1) },
                React.createElement("span", { style: spanstyle },
                    p.action.type,
                    " ",
                    targetname),
                React.createElement("select", { value: action.animid, onChange: e => p.onChange({ ...action, animid: +e.currentTarget.value }) }, Object.entries(action.anims).map(([k, v]) => React.createElement("option", { key: k, value: v }, k))),
                remove));
        }
        case "delay": {
            return (React.createElement("div", { style: gridstyle(1) },
                React.createElement("span", { style: spanstyle },
                    p.action.type,
                    " (ms)"),
                React.createElement(InputCommitted, { type: "number", value: action.duration, onChange: e => p.onChange({ ...action, duration: +e.currentTarget.value }) }),
                remove));
        }
        case "location": {
            return (React.createElement(React.Fragment, null,
                React.createElement("div", { style: gridstyle(0) },
                    React.createElement("span", { style: spanstyle },
                        p.action.type,
                        " ",
                        targetname),
                    remove),
                React.createElement("div", { style: { ...gridstyle(0), gridTemplateColumns: "1em 2fr repeat(2,minmax(0,1fr))" } },
                    React.createElement("span", { style: { gridColumn: "2" } }, "Floor+offset"),
                    React.createElement(InputCommitted, { type: "number", value: action.level, step: 1, onChange: e => p.onChange({ ...action, level: +e.currentTarget.value }) }),
                    React.createElement(InputCommitted, { type: "number", value: action.dy, onChange: e => p.onChange({ ...action, dy: +e.currentTarget.value }) }),
                    React.createElement("span", { style: { gridColumn: "2" } }, "Position x,z"),
                    React.createElement(InputCommitted, { type: "number", value: action.x, onChange: e => p.onChange({ ...action, x: +e.currentTarget.value }) }),
                    React.createElement(InputCommitted, { type: "number", value: action.z, onChange: e => p.onChange({ ...action, z: +e.currentTarget.value }) }),
                    React.createElement("span", { style: { gridColumn: "2" } }, "Rotation"),
                    React.createElement(InputCommitted, { type: "number", style: { gridColumn: "span 2" }, value: action.rotation, onChange: e => p.onChange({ ...action, rotation: +e.currentTarget.value }) }))));
        }
        case "scale": {
            return (React.createElement("div", { style: gridstyle(3) },
                React.createElement("span", { style: spanstyle },
                    p.action.type,
                    " ",
                    targetname),
                React.createElement(InputCommitted, { type: "number", value: action.scalex, onChange: e => p.onChange({ ...action, scalex: +e.currentTarget.value }) }),
                React.createElement(InputCommitted, { type: "number", value: action.scalez, onChange: e => p.onChange({ ...action, scalez: +e.currentTarget.value }) }),
                React.createElement(InputCommitted, { type: "number", value: action.scaley, onChange: e => p.onChange({ ...action, scaley: +e.currentTarget.value }) }),
                remove));
        }
        case "visibility": {
            return (React.createElement("div", { style: gridstyle(1) },
                React.createElement("span", { style: spanstyle },
                    p.action.type,
                    " ",
                    targetname),
                React.createElement("label", null,
                    React.createElement("input", { type: "checkbox", checked: action.visible, onChange: e => p.onChange({ ...action, visible: e.currentTarget.checked }) })),
                remove));
        }
    }
}
function convertScenarioComponent(comp) {
    let mods = { replaceColors: [], replaceMaterials: [], lodLevel: -1 };
    if (comp.simpleModel.length != 0) {
        let firstmodel = comp.simpleModel[0];
        for (let col of firstmodel.mods.replaceColors ?? []) {
            if (comp.simpleModel.every(q => q.mods.replaceColors?.some(q => q[0] == col[0] && q[1] == col[1]))) {
                mods.replaceColors.push(col);
            }
        }
        for (let mat of firstmodel.mods.replaceMaterials ?? []) {
            if (comp.simpleModel.every(q => q.mods.replaceMaterials?.some(q => q[0] == mat[0] && q[1] == mat[1]))) {
                mods.replaceMaterials.push(mat);
            }
        }
    }
    let models = comp.simpleModel.map(model => ({
        ...model,
        mods: {
            replaceColors: model.mods.replaceColors?.filter(q => !mods.replaceColors.some(col => col[0] == q[0] && col[1] == q[1])) ?? [],
            replaceMaterials: model.mods.replaceMaterials?.filter(q => !mods.replaceMaterials.some(mat => mat[0] == q[0] && mat[1] == q[1])) ?? []
        }
    }));
    let json = customModelJson(models, mods);
    return {
        type: "custom",
        modelkey: json,
        name: comp.name + "*",
        simpleModel: models,
        globalMods: mods,
        basecomp: comp.modelkey
    };
}
function RecolorList(p) {
    let [addid, setAddid] = React.useState(0);
    let editcolor = (icol, v) => {
        let newcols = p.cols.slice() ?? [];
        if (v == null) {
            newcols.splice(icol, 1);
        }
        else {
            newcols[icol] = [newcols[icol][0], v];
        }
        p.onChange(newcols);
    };
    if (!p.showAdd && p.cols.length == 0) {
        return null;
    }
    return (React.createElement("div", { className: "mv-overridegroup" },
        React.createElement("div", { style: { gridColumn: "1/-1", textAlign: "center" } }, "Color overrides"),
        p.cols.flatMap((col, i) => {
            return [
                React.createElement("div", { key: `${i}a` }, col[0]),
                React.createElement(InputCommitted, { key: `${i}b`, type: "color", value: hsl2hex(col[1]), onChange: e => editcolor(i, hex2hsl(e.currentTarget.value)) }),
                React.createElement("input", { key: `${i}c`, type: "button", className: "sub-btn", value: "x", onClick: e => editcolor(i, null) })
            ];
        }),
        React.createElement("input", { type: "number", value: addid, onChange: e => setAddid(+e.currentTarget.value) }),
        React.createElement("input", { type: "button", value: "add color", className: "sub-btn", onClick: e => p.onChange(p.cols.concat([[addid, 0]])) })));
}
function RematerialList(p) {
    let [addid, setAddid] = React.useState(0);
    let editmaterial = (icol, v) => {
        let newcols = p.mats.slice() ?? [];
        if (v == null) {
            newcols.splice(icol, 1);
        }
        else {
            newcols[icol] = [newcols[icol][0], v];
        }
        p.onChange(newcols);
    };
    if (!p.showAdd && p.mats.length == 0) {
        return null;
    }
    return (React.createElement("div", { className: "mv-overridegroup" },
        React.createElement("div", { style: { gridColumn: "1/-1", textAlign: "center" } }, "Material overrides"),
        p.mats.flatMap((col, i) => {
            return [
                React.createElement("div", { key: `${i}a` }, col[0]),
                React.createElement(InputCommitted, { key: `${i}b`, type: "number", value: col[1], onChange: e => editmaterial(i, +e.currentTarget.value) }),
                React.createElement("input", { key: `${i}c`, type: "button", className: "sub-btn", value: "x", onClick: e => editmaterial(i, null) })
            ];
        }),
        React.createElement("input", { type: "number", value: addid, onChange: e => setAddid(+e.currentTarget.value) }),
        React.createElement("input", { type: "button", value: "add material", className: "sub-btn", onClick: e => p.onChange(p.mats.concat([[addid, 0]])) })));
}
function ScenarionComponentModelSettings(p) {
    let [showopts, setShowopts] = React.useState(false);
    let editcolor = (v) => {
        p.onChange(p.index, { ...p.comp, mods: { ...p.comp.mods, replaceColors: v } });
    };
    let editmats = (v) => {
        p.onChange(p.index, { ...p.comp, mods: { ...p.comp.mods, replaceMaterials: v } });
    };
    let totaloverrides = (p.comp.mods.replaceColors?.length ?? 0) + (p.comp.mods.replaceMaterials?.length ?? 0);
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { style: { clear: "both", overflow: "hidden" } },
            "modelid: ",
            p.comp.modelid,
            React.createElement("input", { type: "button", className: "sub-btn", value: "x", onClick: e => p.onChange(p.index, null), style: { float: "right" } }),
            React.createElement("input", { type: "button", className: "sub-btn", value: showopts ? "collapse" : `overrides (${totaloverrides})`, onClick: e => setShowopts(!showopts), style: { float: "right" } })),
        showopts && (React.createElement("div", { className: "mv-overridegroup__border" },
            React.createElement(RecolorList, { cols: p.comp.mods.replaceColors ?? [], onChange: editcolor, showAdd: showopts }),
            React.createElement(RematerialList, { mats: p.comp.mods.replaceMaterials ?? [], onChange: editmats, showAdd: showopts })))));
}
function ScenarionComponentSettings(p) {
    let [addid, setAddid] = React.useState(0);
    let addmodel = () => {
        let m = p.comp.simpleModel.concat({ modelid: addid, mods: {} });
        p.onChange({
            ...p.comp,
            modelkey: customModelJson(m, p.comp.globalMods),
            simpleModel: m
        });
    };
    let change = (i, def) => {
        let m = p.comp.simpleModel.slice();
        if (def) {
            m[i] = def;
        }
        else {
            m.splice(i, 1);
        }
        p.onChange({
            ...p.comp,
            modelkey: customModelJson(m, p.comp.globalMods),
            simpleModel: m
        });
    };
    let changeColors = (v) => {
        let mods = { ...p.comp.globalMods, replaceColors: v };
        p.onChange({
            ...p.comp,
            modelkey: customModelJson(p.comp.simpleModel, mods),
            globalMods: mods
        });
    };
    let changeMats = (v) => {
        let mods = { ...p.comp.globalMods, replaceMaterials: v };
        p.onChange({
            ...p.comp,
            modelkey: customModelJson(p.comp.simpleModel, mods),
            globalMods: mods
        });
    };
    return (React.createElement(React.Fragment, null,
        p.comp.simpleModel.map((q, i) => React.createElement(ScenarionComponentModelSettings, { index: i, key: i, comp: q, onChange: change })),
        React.createElement("div", { className: "mv-overridegroup" },
            React.createElement("input", { type: "number", value: addid, onChange: e => setAddid(+e.currentTarget.value) }),
            React.createElement("input", { type: "button", value: "add model", className: "sub-btn", onClick: addmodel })),
        p.showOpts && (React.createElement("div", { className: "mv-overridegroup__border" },
            React.createElement(RecolorList, { cols: p.comp.globalMods.replaceColors ?? [], onChange: changeColors, showAdd: true }),
            React.createElement(RematerialList, { mats: p.comp.globalMods.replaceMaterials ?? [], onChange: changeMats, showAdd: true })))));
}
// function editScenarioComponent(comp: ScenarioComponent, onChange: (v: ScenarioComponent | null) => void) {
// 	let box = showModal({ title: "Edit Component" }, <div>{<ScenarionComponentSettings comp={comp} onChange={onChange} />}</div>);
// }
function ScenarioComponentControl(p) {
    let [showOpts, setShowOpts] = React.useState(false);
    let edit = () => {
        if (p.comp.type == "simple") {
            p.onChange(convertScenarioComponent(p.comp));
            setShowOpts(true);
        }
    };
    let revert = async () => {
        if (p.comp.type != "custom" || !p.ctx) {
            return;
        }
        let def = await modelInitToModel(p.ctx.sceneCache, p.comp.basecomp);
        p.onChange({
            type: "simple",
            modelkey: p.comp.basecomp,
            name: p.comp.name.replace(/\*$/, ""),
            simpleModel: def.models
        });
    };
    return (React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr min-content min-content min-content", alignItems: "baseline" } },
        React.createElement("div", { style: { maxWidth: "100%", overflow: "hidden" } }, p.comp.name),
        p.comp.type == "custom" && React.createElement("input", { type: "button", className: "sub-btn", value: showOpts ? "-" : "+", onClick: e => setShowOpts(!showOpts) }),
        p.comp.type == "simple" && React.createElement("input", { type: "button", className: "sub-btn", value: "edit", onClick: edit }),
        p.comp.type == "custom" && React.createElement("input", { type: "button", className: "sub-btn", value: "revert", onClick: revert }),
        React.createElement("input", { type: "button", className: "sub-btn", value: "x", onClick: e => p.onChange(null) }),
        p.comp.type == "custom" && showOpts && (React.createElement("div", { style: { gridColumn: "1/-1" } },
            React.createElement(ScenarionComponentSettings, { comp: p.comp, onChange: p.onChange, showOpts: showOpts })))));
}
function customModelJson(models, globalmods) {
    return JSON.stringify({ models: models, globalMods: globalmods });
}
function modeldefJsonToModel(cache, json) {
    let d = JSON.parse(json);
    assertSchema(d, customModelDefSchema);
    let models = [];
    return {
        id: json,
        info: null,
        models: models,
        anims: {},
        name: "custom"
    };
}
async function modelInitToModel(cache, init) {
    let [key] = init.split(":", 1);
    let id = init.slice(key.length + 1);
    if (key == "model") {
        return modelToModel(cache, +id);
    }
    else if (key == "item") {
        return itemToModel(cache, +id);
    }
    else if (key == "npc") {
        return npcBodyToModel(cache, +id);
    }
    else if (key == "loc") {
        return locToModel(cache, +id);
    }
    else if (key == "spotanim") {
        return spotAnimToModel(cache, +id);
    }
    else if (key == "player") {
        return playerToModel(cache, id);
    }
    else if (key == "custom") {
        return modeldefJsonToModel(cache, id);
    }
    else {
        throw new Error("unknown modelinit type");
    }
}
export class SceneScenario extends React.Component {
    constructor(p) {
        super(p);
        this.models = new Map();
        this.idcounter = 0;
        this.mapoffset = null;
        this.mapgrid = new CombinedTileGrid([]);
        this.hadctx = false;
        this.state = {
            actions: [],
            components: {},
            addModelType: "model",
            addActionType: "anim",
            addActionTarget: -1
        };
        this.loadFromJson(p.initialId, true);
    }
    loadFromJson(str, isinit = false) {
        let newstate = parseJsonOrDefault(str, scenarioStateSchema, () => {
            if (!isinit) {
                throw new Error("invalid state json");
            }
            return { actions: [], components: {} };
        });
        let keys = Object.keys(newstate.components);
        this.idcounter = (keys.length == 0 ? 0 : Math.max.apply(null, keys) + 1);
        this.hadctx = false;
        if (isinit) {
            Object.assign(this.state, newstate);
        }
        else {
            this.setSceneState(newstate.components, newstate.actions);
        }
    }
    componentWillUnmount() {
        for (let model of this.models.values()) {
            model.cleanup();
        }
    }
    async addComp(id) {
        if (!this.props.ctx) {
            return;
        }
        if (this.state.addModelType == "map") {
            let rect = stringToMapArea(id);
            if (!rect) {
                throw new Error("invalid map rect");
            }
            let compid = this.idcounter++;
            this.editComp(compid, {
                type: "map",
                modelkey: `${this.state.addModelType}:${id}`,
                name: `map${id}`,
                mapRect: rect
            });
        }
        else {
            let prim = await modelInitToModel(this.props.ctx.sceneCache, `${this.state.addModelType}:${id}`);
            let compid = this.idcounter++;
            this.editComp(compid, {
                type: "simple",
                modelkey: `${this.state.addModelType}:${id}`,
                name: `${this.state.addModelType}:${id}`,
                simpleModel: prim.models
            });
            if (Object.keys(prim.anims).length != 0) {
                this.editAction(this.state.actions.length, {
                    type: "animset",
                    target: compid,
                    animid: Number(prim.anims.default ?? Object.keys(prim.anims)[0]),
                    anims: prim.anims
                });
            }
        }
    }
    addAction() {
        let action;
        switch (this.state.addActionType) {
            case "anim":
                action = { type: "anim", target: this.state.addActionTarget, animid: 0 };
                break;
            case "delay":
                action = { type: "delay", target: -1, duration: 0 };
                break;
            case "location":
                action = { type: "location", target: this.state.addActionTarget, level: 0, x: 0, z: 0, dy: 0, rotation: 0 };
                break;
            case "visibility":
                action = { type: "visibility", target: this.state.addActionTarget, visible: true };
                break;
            case "scale":
                action = { type: "scale", target: this.state.addActionTarget, scalex: 1, scaley: 1, scalez: 1 };
                break;
            default:
                throw new Error("unknown action " + this.state.addActionType);
        }
        this.editAction(this.state.actions.length, action);
    }
    getSceneJson(newstate = this.state) {
        return JSON.stringify({ components: newstate.components, actions: newstate.actions });
    }
    setSceneState(components, actions) {
        this.setState(prev => {
            let scenestate = {
                components: components ?? prev.components,
                actions: actions ?? prev.actions
            };
            //double json is correct in this case
            localStorage.rsmv_lastsearch = JSON.stringify(this.getSceneJson(scenestate));
            return scenestate;
        });
    }
    ensureComp(uictx, newcomp, oldcomp) {
        let newmodel = undefined;
        if (oldcomp) {
            let oldmodel = this.models.get(oldcomp);
            if (newcomp && oldcomp.modelkey == newcomp.modelkey) {
                newmodel = oldmodel;
            }
            else {
                this.models.delete(oldcomp);
                oldmodel?.cleanup();
            }
        }
        if (newcomp) {
            if (!newmodel) {
                if (newcomp.type == "simple") {
                    newmodel = new RSModel(uictx.sceneCache, newcomp.simpleModel, newcomp.name);
                }
                else if (newcomp.type == "custom") {
                    let mappedmodel = newcomp.simpleModel.map(model => ({
                        ...model,
                        mods: {
                            replaceColors: (model.mods.replaceColors ?? []).concat(newcomp.globalMods.replaceColors),
                            replaceMaterials: (model.mods.replaceMaterials ?? []).concat(newcomp.globalMods.replaceMaterials)
                        }
                    }));
                    newmodel = new RSModel(uictx.sceneCache, mappedmodel, newcomp.name);
                }
                else if (newcomp.type == "map") {
                    newmodel = new RSMapChunkGroup(uictx.sceneCache, newcomp.mapRect, { collision: false, invisibleLayers: false, map2d: false, skybox: true });
                    newmodel.on("loaded", this.updateGrids);
                    let hasmap = Object.values(this.state.components).some(q => q.type == "map");
                    if (!hasmap || !this.mapoffset) {
                        this.mapoffset = {
                            x: (newcomp.mapRect.x + newcomp.mapRect.xsize / 2) * rs2ChunkSize,
                            z: (newcomp.mapRect.z + newcomp.mapRect.zsize / 2) * rs2ChunkSize
                        };
                    }
                    newmodel.chunks.forEach(q => q.rootnode.position.set(-this.mapoffset.x * tiledimensions, 0, -this.mapoffset.z * tiledimensions));
                }
                else {
                    throw new Error("invalid model init");
                }
                newmodel.addToScene(uictx.renderer);
            }
            this.models.set(newcomp, newmodel);
        }
    }
    editComp(compid, newcomp) {
        if (!this.props.ctx) {
            return;
        }
        let components = { ...this.state.components };
        let oldcomp = this.state.components[compid];
        this.ensureComp(this.props.ctx, newcomp, oldcomp);
        if (newcomp) {
            components[compid] = newcomp;
        }
        else {
            delete components[compid];
            this.setSceneState(null, this.state.actions.filter(q => q.target != compid));
        }
        this.setSceneState(components, null);
        if (!components[this.state.addActionTarget]) {
            let ids = Object.keys(components);
            this.setState({ addActionTarget: (ids.length == 0 ? 0 : +ids[ids.length - 1]) });
        }
        this.restartAnims();
    }
    editAction(index, newaction) {
        let actions = this.state.actions.slice();
        if (newaction?.type == "anim" || newaction?.type == "animset") {
            let model = this.modelIdToModel(newaction.target);
            if (model instanceof RSModel) {
                model.loadAnimation(newaction.animid);
            }
        }
        if (newaction) {
            actions[index] = newaction;
        }
        else {
            actions.splice(index, 1);
        }
        this.setSceneState(null, actions);
        this.restartAnims();
    }
    modelIdToModel(id) {
        let modelinfo = this.state.components[id];
        return this.models.get(modelinfo);
    }
    updateGrids() {
        let grids = [];
        for (let comp of Object.values(this.state.components)) {
            if (comp.type != "map") {
                continue;
            }
            let model = this.models.get(comp);
            let chunks = [];
            if (model instanceof RSMapChunk) {
                chunks.push(model);
            }
            else if (model instanceof RSMapChunkGroup) {
                chunks.push(...model.chunks);
            }
            else {
                continue;
            }
            for (let chunk of chunks) {
                if (!chunk.loaded) {
                    continue;
                }
                grids.push({
                    src: chunk.loaded.grid,
                    rect: {
                        x: chunk.chunkx * rs2ChunkSize,
                        z: chunk.chunkz * rs2ChunkSize,
                        xsize: rs2ChunkSize,
                        zsize: rs2ChunkSize
                    }
                });
            }
        }
        this.mapgrid = new CombinedTileGrid(grids);
        this.restartAnims();
    }
    async restartAnims() {
        //TODO ensure this function loops and only one instance is looping
        //otherwise we might be using old data from before setstate
        await delay(1);
        let totalduration = 0;
        for (let model of this.models.values()) {
            model.mixer.setTime(0);
        }
        for (const action of this.state.actions) {
            switch (action.type) {
                case "animset":
                case "anim": {
                    let model = this.modelIdToModel(action.target);
                    if (model instanceof RSModel) {
                        model.setAnimation(action.animid);
                    }
                    break;
                }
                case "location": {
                    let model = this.modelIdToModel(action.target);
                    let groundy = getTileHeight(this.mapgrid, action.x + (this.mapoffset?.x ?? 0), action.z + (this.mapoffset?.z ?? 0), action.level);
                    model?.rootnode.position.set(action.x * tiledimensions, groundy + action.dy * tiledimensions, action.z * tiledimensions);
                    model?.rootnode.rotation.set(0, ((action.rotation ?? 0) * Math.PI) / 4, 0);
                    break;
                }
                case "scale": {
                    let model = this.modelIdToModel(action.target);
                    model?.rootnode.scale.set(action.scalex, action.scaley, action.scalez);
                    break;
                }
                case "delay": {
                    totalduration += action.duration;
                    await delay(action.duration);
                    break;
                }
                case "visibility": {
                    let model = this.modelIdToModel(action.target);
                    if (model) {
                        model.rootnode.visible = action.visible;
                    }
                    break;
                }
            }
        }
    }
    advancedIdSelect() {
        if (!this.props.ctx) {
            return;
        }
        if (this.state.addModelType == "npc") {
            selectEntity(this.props.ctx, "npcs", id => this.addComp("" + id), [{ path: ["name"], search: "" }]);
        }
        else if (this.state.addModelType == "item") {
            selectEntity(this.props.ctx, "items", id => this.addComp("" + id), [{ path: ["name"], search: "" }]);
        }
        else if (this.state.addModelType == "loc") {
            selectEntity(this.props.ctx, "objects", id => this.addComp("" + id), [{ path: ["name"], search: "" }]);
        }
    }
    render() {
        if (!this.hadctx && this.props.ctx) {
            this.hadctx = true;
            Object.entries(this.state.components).forEach(([key, comp]) => this.ensureComp(this.props.ctx, comp, this.state.components[key]));
            this.restartAnims();
        }
        const hasmodels = Object.keys(this.state.components).length != 0;
        const hasAdvLookup = this.state.addModelType == "item" || this.state.addModelType == "loc" || this.state.addModelType == "npc";
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { className: "mv-sidebar-scroll" },
                React.createElement("h2", null, "Models"),
                React.createElement("div", null,
                    React.createElement(CopyButton, { getText: this.getSceneJson }),
                    React.createElement(PasteButton, { onPaste: v => this.loadFromJson(v, false) })),
                React.createElement("div", { style: { display: "flex", flexDirection: "column" } },
                    React.createElement("select", { value: this.state.addModelType, onChange: e => this.setState({ addModelType: e.currentTarget.value }) },
                        React.createElement("option", { value: "model" }, "model"),
                        React.createElement("option", { value: "npc" }, "npc"),
                        React.createElement("option", { value: "spotanim" }, "spotanim"),
                        React.createElement("option", { value: "loc" }, "location"),
                        React.createElement("option", { value: "player" }, "player"),
                        React.createElement("option", { value: "item" }, "item"),
                        React.createElement("option", { value: "map" }, "map")),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "minmax(0,1fr) min-content" } },
                        React.createElement(StringInput, { onChange: this.addComp }),
                        hasAdvLookup && React.createElement("input", { type: "button", className: "sub-btn", value: "Lookup", onClick: this.advancedIdSelect }))),
                !hasmodels && React.createElement("p", null, "Select a model type and id to add to the scene."),
                hasmodels && React.createElement("br", null),
                hasmodels && (React.createElement("div", { className: "mv-inset" }, Object.entries(this.state.components).map(([id, comp]) => {
                    return React.createElement(ScenarioComponentControl, { key: id, ctx: this.props.ctx, comp: comp, onChange: e => this.editComp(+id, e) });
                }))),
                React.createElement("h2", null, "Action sequence"),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr min-content" } },
                    React.createElement("select", { value: this.state.addActionType, onChange: e => this.setState({ addActionType: e.currentTarget.value }) },
                        React.createElement("option", { value: "location" }, "Location"),
                        React.createElement("option", { value: "scale" }, "Scale"),
                        React.createElement("option", { value: "anim" }, "Anim"),
                        React.createElement("option", { value: "delay" }, "Delay"),
                        React.createElement("option", { value: "visibility" }, "Visibility")),
                    React.createElement("select", { disabled: this.state.addActionType == "delay", value: this.state.addActionType == "delay" ? -1 : this.state.addActionTarget, onChange: e => this.setState({ addActionTarget: +e.currentTarget.value }) },
                        Object.entries(this.state.components).map(([key, c]) => React.createElement("option", { key: key, value: key }, c.name)),
                        this.state.addActionType == "delay" && React.createElement("option", { value: "-1" })),
                    React.createElement("input", { type: "button", className: "sub-btn", value: "add", onClick: this.addAction })),
                React.createElement("div", { onClick: this.restartAnims }, "restart"),
                this.state.actions.length != 0 && React.createElement("br", null),
                this.state.actions.length != 0 && (React.createElement("div", { className: "mv-inset" }, this.state.actions.map((a, i) => {
                    let comp = this.state.components[a.target];
                    return React.createElement(ScenarioActionControl, { key: i, comp: comp, action: a, onChange: e => this.editAction(i, e) });
                }))))));
    }
}
__decorate([
    boundMethod
], SceneScenario.prototype, "addComp", null);
__decorate([
    boundMethod
], SceneScenario.prototype, "addAction", null);
__decorate([
    boundMethod
], SceneScenario.prototype, "getSceneJson", null);
__decorate([
    boundMethod
], SceneScenario.prototype, "updateGrids", null);
__decorate([
    boundMethod
], SceneScenario.prototype, "restartAnims", null);
__decorate([
    boundMethod
], SceneScenario.prototype, "advancedIdSelect", null);
function ScenePlayer(p) {
    const [data, model, id, setId] = useAsyncModelData(p.ctx, playerDataToModel);
    const [errtext, seterrtext] = React.useState("");
    const forceUpdate = useForceUpdate();
    const typedId = id;
    const player = typedId?.player ?? (p.initialId && typeof p.initialId == "object" && typeof p.initialId.player == "string" ? p.initialId.player : "");
    const head = typedId?.head ?? (p.initialId && typeof p.initialId == "object" && typeof p.initialId.head == "boolean" ? p.initialId.head : false);
    const oncheck = (e) => {
        if (typedId) {
            setId({ player: typedId.player, data: typedId.data, head: e.currentTarget.checked });
        }
    };
    const nameChange = async (v) => {
        if (v.length <= 20) {
            let url = appearanceUrl(v);
            let data = await fetch(url).then(q => q.text());
            if (data.indexOf("404 - Page not found") != -1) {
                seterrtext(`Player avatar not found for '${v}'.`);
                return;
            }
            let buf = avatarStringToBytes(data);
            setId({ player: v, data: buf, head });
            seterrtext("");
        }
        else {
            try {
                let buf = avatarStringToBytes(v);
                setId({ player: "", data: buf, head: head });
                seterrtext("");
            }
            catch (e) {
                seterrtext("invalid avatar base64 string");
            }
        }
    };
    const equipChanged = (index, type, equipid) => {
        let oldava = data?.info.avatar;
        if (!oldava) {
            console.trace("unexpected");
            return;
        }
        let newava = { ...oldava };
        newava.slots = oldava.slots.slice();
        if (type == "none") {
            newava.slots[index] = { slot: null, cust: null };
        }
        else {
            newava.slots[index] = { slot: { type, id: equipid }, cust: null };
        }
        let avabuf = writeAvatar(newava, data?.info.gender ?? 0, null);
        setId({ player, data: avabuf, head });
    };
    const customizationChanged = (index, cust) => {
        let oldava = data?.info.avatar;
        if (!oldava) {
            console.trace("unexpected");
            return;
        }
        let newava = { ...oldava };
        newava.slots = oldava.slots.slice();
        newava.slots[index] = { ...oldava.slots[index], cust };
        let avabuf = writeAvatar(newava, data?.info.gender ?? 0, null);
        setId({ player, data: avabuf, head });
    };
    const setGender = (gender) => {
        if (!data?.info.avatar) {
            console.trace("unexpected");
            return;
        }
        let avabuf = writeAvatar(data.info.avatar, gender, null);
        setId({ player, data: avabuf, head });
    };
    const changeColor = (colid, index) => {
        let oldava = data?.info.avatar;
        if (!oldava) {
            console.trace("unexpected");
            return;
        }
        let newava = { ...oldava };
        newava[colid] = index;
        let avabuf = writeAvatar(newava, data?.info.gender ?? 0, null);
        setId({ player, data: avabuf, head });
    };
    const colorDropdown = (id, v, opts) => {
        return (React.createElement(LabeledInput, { label: String(id) },
            React.createElement("select", { value: v, onChange: e => changeColor(id, +e.currentTarget.value), style: { backgroundColor: hsl2hex(opts[v]) } }, Object.entries(opts).map(([i, v]) => React.createElement("option", { key: i, value: i, style: { backgroundColor: hsl2hex(v) } }, i)))));
    };
    return (React.createElement(React.Fragment, null,
        React.createElement(StringInput, { onChange: nameChange, initialid: player }),
        errtext && (React.createElement("div", { className: "mv-errortext", onClick: e => seterrtext("") }, errtext)),
        id == null && (React.createElement(React.Fragment, null,
            React.createElement("p", null, "Type a player name to view their 3d avatar. You can then customize the avatar appearance."),
            React.createElement("p", null, "You can update your avatar by going to the photo booth southwest of falador in-game"))),
        data && (React.createElement(LabeledInput, { label: "Animation" },
            React.createElement("select", { onChange: e => { model?.setAnimation(+e.currentTarget.value); forceUpdate(); }, value: model?.targetAnimId ?? -1 }, Object.entries(data.anims).map(([k, v]) => React.createElement("option", { key: k, value: v }, k))))),
        data && React.createElement("label", null,
            React.createElement("input", { type: "checkbox", checked: head, onChange: oncheck }),
            "Head"),
        React.createElement("div", { className: "mv-sidebar-scroll" },
            data && React.createElement("h2", null, "Slots"),
            React.createElement("div", { style: { userSelect: "text" } }, p.ctx && data?.info.avatar?.slots.map((q, i) => {
                return (React.createElement(AvatarSlot, { key: i, index: i, slot: q.slot, cust: q.cust, ctx: p.ctx, custChanged: customizationChanged, female: data.info.gender == 1, equipChanged: equipChanged }));
            })),
            data && React.createElement("h2", null, "Settings"),
            data && (React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr" } },
                React.createElement("input", { type: "button", className: classNames("sub-btn", { active: data.info.gender == 0 }), onClick: e => setGender(0), value: "Male" }),
                React.createElement("input", { type: "button", className: classNames("sub-btn", { active: data.info.gender == 1 }), onClick: e => setGender(1), value: "Female" }))),
            data?.info.avatar && colorDropdown("haircol0", data.info.avatar.haircol0, data.info.kitcolors.hair),
            data?.info.avatar && colorDropdown("haircol1", data.info.avatar.haircol1, data.info.kitcolors.hair),
            data?.info.avatar && colorDropdown("bodycol", data.info.avatar.bodycol, data.info.kitcolors.clothes),
            data?.info.avatar && colorDropdown("legscol", data.info.avatar.legscol, data.info.kitcolors.clothes),
            data?.info.avatar && colorDropdown("bootscol", data.info.avatar.bootscol, data.info.kitcolors.feet),
            data?.info.avatar && colorDropdown("skincol0", data.info.avatar.skincol0, data.info.kitcolors.skin),
            data?.info.avatar && colorDropdown("skincol1", data.info.avatar.skincol1, data.info.kitcolors.skin),
            data && (React.createElement(React.Fragment, null,
                React.createElement("h2", null, "Export"),
                React.createElement("p", null, "Use the export button at the top of the sidebar to export the model."),
                React.createElement("p", null, "Use this button to copy the customized avatar for later use. You can paste it in the name field"),
                React.createElement(CopyButton, { text: bytesToAvatarString(data.info.buffer) }))))));
}
function AvatarSlot({ index, slot, cust, custChanged, equipChanged, ctx, female }) {
    let editcust = (ch) => {
        if (!ch) {
            custChanged(index, null);
        }
        else {
            let newcust = { color: null, flag2: null, material: null, model: null, ...cust };
            ch(newcust);
            if (!newcust.color && !newcust.flag2 && !newcust.material && !newcust.model) {
                custChanged(index, null);
            }
            else {
                custChanged(index, newcust);
            }
        }
    };
    let searchItem = () => {
        selectEntity(ctx, "items", i => equipChanged(index, "item", i), [{ path: ["equipSlotId"], search: index + "" }, { path: ["name"], search: "" }]);
    };
    let searchKit = () => {
        let kitid = (female ? slotToKitFemale : slotToKitMale)[index] ?? -1;
        selectEntity(ctx, "identitykit", i => equipChanged(index, "kit", i), [{ path: ["bodypart"], search: kitid + "" }]);
    };
    return (React.createElement("div", null,
        slot && (React.createElement("div", { style: { display: "grid", gridTemplateColumns: "auto repeat(10,min-content)" } },
            React.createElement("span", null, slot.name),
            !cust?.color?.col2 && !cust?.color?.col4 && slot.replaceColors.length != 0 && (React.createElement("input", { type: "button", className: "sub-btn", value: "C", title: "Recolor using predefined recolor slots", onClick: e => editcust(c => c.color = { col4: null, col2: slot.replaceColors.map(q => q[1]) }) })),
            !cust?.color?.col2 && !cust?.color?.col4 && (React.createElement("input", { type: "button", className: "sub-btn", value: "C4", title: "Force recolor 4 colors", onClick: e => editcust(c => c.color = { col4: [[0, 0], [0, 0], [0, 0], [0, 0]], col2: null }) })),
            !cust?.material && slot.replaceMaterials.length != 0 && (React.createElement("input", { type: "button", className: "sub-btn", value: "T", title: "Replace material in predefined material slots", onClick: e => editcust(c => c.material = { header: 0, materials: slot.replaceMaterials.map(q => q[1]) }) })),
            !cust?.model && (React.createElement("input", { type: "button", className: "sub-btn", value: "M", title: "Replace models", onClick: e => editcust(c => c.model = slot.models.slice()) })),
            React.createElement("input", { type: "button", className: "sub-btn", value: "x", onClick: e => equipChanged(index, "none", 0) }))),
        !slot && (React.createElement("div", { style: { display: "grid", gridTemplateColumns: "auto repeat(10,min-content)" } },
            slotNames[index],
            React.createElement("input", { type: "button", className: "sub-btn", value: "Item", onClick: searchItem }),
            React.createElement("input", { type: "button", className: "sub-btn", value: "Kit", onClick: searchKit }))),
        slot && cust?.color?.col2 && (React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${slot.replaceColors.length},1fr) min-content` } },
            slot.replaceColors.map((q, i) => (React.createElement(InputCommitted, { key: i, type: "color", value: hsl2hex(cust.color.col2[i]), onChange: e => editcust(c => c.color.col2[i] = hex2hsl(e.currentTarget.value)) }))),
            React.createElement("input", { type: "button", className: "sub-btn", value: "x", onClick: e => editcust(c => c.color = null) }))),
        slot && cust?.color?.col4 && (React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(4,minmax(0,1fr)) min-content`, gridTemplateRows: "auto auto", gridAutoFlow: "column" } },
            cust.color.col4.map(([from, to], i) => (React.createElement(React.Fragment, { key: i },
                React.createElement(InputCommitted, { type: "number", value: from, onChange: e => editcust(c => c.color.col4[i][0] = +e.currentTarget.value) }),
                React.createElement(InputCommitted, { type: "color", value: hsl2hex(to), onChange: e => editcust(c => c.color.col4[i][1] = hex2hsl(e.currentTarget.value)) })))),
            React.createElement("input", { type: "button", style: { gridRow: "1/span 2" }, className: "sub-btn", value: "x", onClick: e => editcust(c => c.color = null) }))),
        slot && cust?.material && (React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${slot.replaceMaterials.length},1fr) min-content` } },
            slot.replaceMaterials.map((q, i) => (React.createElement(InputCommitted, { key: i, type: "number", value: cust.material.materials[i], onChange: e => editcust(c => c.material.materials[i] = +e.currentTarget.value) }))),
            React.createElement("input", { type: "button", className: "sub-btn", value: "x", onClick: e => editcust(c => c.material = null) }))),
        slot && cust?.model && (React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${slot.models.length},1fr) min-content` } },
            slot.models.map((modelid, i) => (React.createElement(InputCommitted, { key: i, type: "number", value: modelid, onChange: e => editcust(c => c.model[i] = +e.currentTarget.value) }))),
            React.createElement("input", { type: "button", className: "sub-btn", value: "x", onClick: e => editcust(c => c.model = null) })))));
}
function hsl2hex(hsl) {
    let rgb = HSL2RGB(packedHSL2HSL(hsl));
    return `#${((rgb[0] << 16) | (rgb[1] << 8) | (rgb[2] << 0)).toString(16).padStart(6, "0")}`;
}
function hex2hsl(hex) {
    let n = parseInt(hex.replace(/^#/, ""), 16);
    return HSL2packHSL(...RGB2HSL((n >> 16) & 0xff, (n >> 8) & 0xff, (n >> 0) & 0xff));
}
const exportimgsizes = [
    { w: 0, h: 0, mode: "standard", name: "View" },
    { w: 1920, h: 1080, mode: "standard", name: "1080p" },
    { w: 2560, h: 1440, mode: "standard", name: "1440p" },
    { w: 3840, h: 2160, mode: "standard", name: "4K" },
    { w: 0, h: 0, mode: "vr360", name: "View" },
    { w: 2048, h: 1024, mode: "vr360", name: "2:1K" },
    { w: 4096, h: 2048, mode: "vr360", name: "4:2K" },
    { w: 0, h: 0, mode: "topdown", name: "View" },
    { w: 512, h: 512, mode: "topdown", name: "" },
    { w: 1024, h: 1024, mode: "topdown", name: "" },
    { w: 2048, h: 2048, mode: "topdown", name: "" },
];
function ExportSceneMenu(p) {
    let [tab, settab] = React.useState("none");
    let [img, setimg] = React.useState(null);
    let [imgsize, setimgsize] = React.useState(exportimgsizes.find(q => q.mode == p.renderopts.camMode) ?? exportimgsizes[0]);
    let [cropimg, setcropimg] = React.useState(true);
    let changeImg = async (instCrop = cropimg, instSize = imgsize) => {
        if (p.renderopts.camMode == "vr360") {
            instCrop = false;
        }
        let newpixels = await p.ctx.renderer.takeScenePicture(instSize.w || undefined, instSize.h || undefined);
        let newimg = makeImageData(newpixels.data, newpixels.width, newpixels.height);
        let cnv = document.createElement("canvas");
        let ctx = cnv.getContext("2d");
        if (instCrop) {
            let bounds = findImageBounds(newimg);
            cnv.width = bounds.width;
            cnv.height = bounds.height;
            ctx.putImageData(newimg, -bounds.x, -bounds.y);
        }
        else {
            cnv.width = newimg.width;
            cnv.height = newimg.height;
            ctx.putImageData(newimg, 0, 0);
        }
        settab("img");
        setcropimg(instCrop);
        setimgsize(instSize);
        setimg({ cnv, data: newimg });
    };
    if (tab == "img" && p.renderopts.camMode == "vr360" && cropimg) {
        changeImg();
    }
    let saveimg = async () => {
        if (!img) {
            return;
        }
        let blob = await new Promise(d => img.cnv.toBlob(d));
        if (!blob) {
            return;
        }
        downloadBlob("runeapps_image_export.png", blob);
    };
    let copyimg = async () => {
        //@ts-ignore
        navigator.clipboard.write([
            //@ts-ignore
            new ClipboardItem({ 'image/png': await new Promise(d => img.cnv.toBlob(d)) })
        ]);
    };
    let saveGltf = async () => {
        let file = await exportThreeJsGltf(p.ctx.renderer.getModelNode());
        downloadBlob("model.glb", new Blob([toBlobPart(file)]));
    };
    let saveStl = async () => {
        let file = await exportThreeJsStl(p.ctx.renderer.getModelNode());
        downloadBlob("model.stl", new Blob([toBlobPart(file)]));
    };
    let clicktab = (v) => {
        settab(v);
        if (v == "img") {
            changeImg(cropimg);
        }
    };
    let show360modal = () => {
        const src = img.cnv;
        showModal({ title: "360 preview of render" }, (React.createElement(React.Fragment, null,
            React.createElement(VR360View, { img: src }))));
    };
    return (React.createElement("div", { className: "mv-inset" },
        React.createElement(TabStrip, { value: tab, tabs: { gltf: "GLTF", stl: "STL", img: "image" }, onChange: clicktab }),
        tab == "img" && (React.createElement(React.Fragment, null,
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr minmax(0,1fr)" } },
                "Export image size",
                React.createElement("select", { value: exportimgsizes.indexOf(imgsize), onChange: e => changeImg(undefined, exportimgsizes[e.currentTarget.value]) }, exportimgsizes.map((q, i) => (q.mode == p.renderopts.camMode && React.createElement("option", { key: i, value: i },
                    q.name,
                    q.w != 0 ? ` ${q.w}x${q.h}` : ""))))),
            p.renderopts.camMode != "vr360" && React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: cropimg, onChange: e => changeImg(e.currentTarget.checked) }),
                "Crop image"),
            p.renderopts.camMode == "vr360" && React.createElement("input", { type: "button", className: "sub-btn", onClick: show360modal, value: "Preview 360" }),
            img && React.createElement(CanvasView, { canvas: img.cnv }),
            React.createElement("div", { style: { display: "grid", grid: "'a b' / 1fr 1fr" } },
                React.createElement("input", { type: "button", className: "sub-btn", value: "Save", onClick: saveimg }),
                React.createElement("input", { type: "button", className: "sub-btn", value: "Clipboard", onClick: copyimg })))),
        tab == "gltf" && (React.createElement(React.Fragment, null,
            React.createElement("p", null, "GLTF is a lightweight 3d format designed for modern but simple model exports. Colors, textures and animations will be included, but advanced lighting effects are lost."),
            React.createElement("input", { style: { width: "100%" }, type: "button", className: "sub-btn", value: "Save", onClick: saveGltf }))),
        tab == "stl" && (React.createElement(React.Fragment, null,
            React.createElement("p", null, "STL is used mostly for 3d printing, this file format only exports the shape of the model. Colors, textures animations will be lost."),
            React.createElement("input", { style: { width: "100%" }, type: "button", className: "sub-btn", value: "Save", onClick: saveStl }))),
        tab == "none" && (React.createElement("p", null, "Select an export type"))));
}
export function RendererControls(p) {
    const elconfig = React.useRef({ options: {} });
    const sceneEl = React.useRef({ getSceneElements() { return elconfig.current; } });
    let [showsettings, setshowsettings] = React.useState(localStorage.rsmv_showsettings == "true");
    let [showexport, setshowexport] = React.useState(false);
    let [hideFog, sethidefog] = React.useState(true);
    let [hideFloor, sethidefloor] = React.useState(false);
    let [camMode, setcammode] = React.useState("standard");
    let [camControls, setcamcontrols] = React.useState("free");
    const render = p.ctx?.renderer;
    let newopts = { hideFog, hideFloor, camMode, camControls };
    let oldopts = elconfig.current.options;
    elconfig.current.options = newopts;
    //I wont tell anyone if you dont tell anyone
    //TODO actually fix this tho
    if (JSON.stringify(oldopts) != JSON.stringify(newopts)) {
        render?.sceneElementsChanged();
    }
    React.useEffect(() => {
        if (render) {
            render.addSceneElement(sceneEl.current);
            return () => { render.removeSceneElement(sceneEl.current); };
        }
    }, [render]);
    const toggleSettings = React.useCallback(() => {
        localStorage.rsmv_showsettings = "" + !showsettings;
        setshowsettings(!showsettings);
    }, [showsettings]);
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr" } },
            React.createElement("input", { type: "button", className: classNames("sub-btn", { "active": showexport }), onClick: e => setshowexport(!showexport), value: "Export" }),
            React.createElement("input", { type: "button", className: classNames("sub-btn", { "active": showsettings }), onClick: toggleSettings, value: "Settings" })),
        showsettings && (React.createElement("div", { className: "mv-inset", style: { display: "grid", gridTemplateColumns: "1fr 1fr" } },
            React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: hideFog, onChange: e => sethidefog(e.currentTarget.checked) }),
                "Hide fog"),
            React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: hideFloor, onChange: e => sethidefloor(e.currentTarget.checked) }),
                "Hide floor"),
            React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: camControls == "world", onChange: e => setcamcontrols(e.currentTarget.checked ? "world" : "free") }),
                "Flat panning"),
            React.createElement("label", null,
                React.createElement("select", { value: camMode, onChange: e => setcammode(e.currentTarget.value) },
                    React.createElement("option", { value: "standard" }, "Standard camera"),
                    React.createElement("option", { value: "topdown" }, "Orthogonal camera"),
                    React.createElement("option", { value: "vr360" }, "360 Camera"))))),
        showexport && p.ctx.canRender() && React.createElement(ExportSceneMenu, { ctx: p.ctx, renderopts: newopts })));
}
function ImageDataView(p) {
    let ref = React.useCallback((cnv) => {
        if (cnv) {
            let ctx = cnv.getContext("2d");
            drawTexture(ctx, p.img);
        }
    }, [p.img]);
    return (React.createElement("canvas", { ref: ref, className: "mv-image-preview-canvas" }));
}
function useAsyncModelData(ctx, getter) {
    let pendingId = React.useRef(null);
    let [loadedModel, setLoadedModel] = React.useState(null);
    let [visible, setVisible] = React.useState(null);
    let [loadedId, setLoadedId] = React.useState(null);
    let setter = React.useCallback(async (id) => {
        if (!ctx) {
            return;
        }
        pendingId.current = id;
        try {
            let res = await getter(ctx.sceneCache, id);
            if (pendingId.current == id) {
                localStorage.rsmv_lastsearch = JSON.stringify(id);
                setVisible(res);
                setLoadedId(id);
            }
        }
        catch (err) {
            if (pendingId.current == id) {
                localStorage.rsmv_lastsearch = JSON.stringify(id);
                setVisible(null);
                setLoadedId(id);
                console.error(err); //TODO make ui
            }
        }
    }, [ctx]);
    React.useLayoutEffect(() => {
        if (visible && ctx) {
            let model = new RSModel(ctx.sceneCache, visible.models, visible.name);
            if (visible.anims.default) {
                model.setAnimation(visible.anims.default);
            }
            model.addToScene(ctx.renderer);
            model.model.then(m => {
                if (visible && pendingId.current == visible.id) {
                    setLoadedModel(model);
                }
            });
            return () => {
                model.cleanup();
            };
        }
    }, [visible, ctx]);
    return [visible, loadedModel, loadedId, setter];
}
async function materialIshToModel(sceneCache, reqid) {
    let matid = -1;
    let color = [255, 0, 255];
    let json = null;
    let texs = {};
    let models = [];
    let addtex = async (type, name, texid, stripalpha) => {
        let tex = await sceneCache.getTextureFile(type, texid, stripalpha);
        let drawable = await tex.toWebgl();
        texs[name] = { texid, filesize: tex.filesize, img0: drawable };
    };
    let overlay = null;
    let underlay = null;
    if (reqid.mode == "overlay") {
        overlay = sceneCache.engine.mapOverlays[reqid.id];
        if (overlay.material) {
            matid = overlay.material;
        }
        if (overlay.color) {
            color = overlay.color;
        }
    }
    else if (reqid.mode == "underlay") {
        underlay = sceneCache.engine.mapUnderlays[reqid.id];
        if (underlay.material) {
            matid = underlay.material;
        }
        if (underlay.color) {
            color = underlay.color;
        }
    }
    else if (reqid.mode == "material") {
        matid = reqid.id;
    }
    else if (reqid.mode == "texture") {
        await addtex("diffuse", "original", reqid.id, false);
        await addtex("diffuse", "opaque", reqid.id, true);
    }
    else {
        throw new Error("invalid materialish mode");
    }
    let assetid = constModelsIds.materialCube;
    let mods = {
        replaceMaterials: [[0, matid]],
        replaceColors: [[
                HSL2packHSL(...RGB2HSL(255, 255, 255)),
                HSL2packHSL(...RGB2HSL(...color))
            ]]
    };
    let mat = sceneCache.engine.getMaterialData(matid);
    for (let tex in mat.textures) {
        if (mat.textures[tex] != 0) {
            await addtex(tex, tex, mat.textures[tex], mat.stripDiffuseAlpha && tex == "diffuse");
        }
    }
    json = mat;
    models.push({ modelid: assetid, mods });
    return castModelInfo({
        models: models,
        anims: {},
        info: { overlay, underlay, texs, obj: json },
        id: reqid,
        name: `${reqid.mode}:${reqid.id}`
    });
}
function SceneMaterialIsh(p) {
    let [data, model, id, setId] = useAsyncModelData(p.ctx, materialIshToModel);
    let initid = id ?? checkObject(p.initialId, { mode: "string", id: "number" }) ?? { mode: "material", id: 0 };
    let modechange = (v) => setId({ mode: v.currentTarget.value, id: initid.id });
    let isproc = p.ctx?.sceneCache.textureType == "fullproc";
    return (React.createElement(React.Fragment, null,
        React.createElement(IdInput, { onChange: v => setId({ ...initid, id: v }), initialid: initid.id }),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "radio", name: "mattype", value: "material", checked: initid.mode == "material", onChange: modechange }),
                "Material"),
            React.createElement("label", null,
                React.createElement("input", { type: "radio", name: "mattype", value: "underlay", checked: initid.mode == "underlay", onChange: modechange }),
                "Underlay"),
            React.createElement("label", null,
                React.createElement("input", { type: "radio", name: "mattype", value: "overlay", checked: initid.mode == "overlay", onChange: modechange }),
                "Overlay"),
            React.createElement("label", null,
                React.createElement("input", { type: "radio", name: "mattype", value: "texture", checked: initid.mode == "texture", onChange: modechange }),
                "Texture")),
        id == null && (React.createElement(React.Fragment, null,
            React.createElement("p", null, "Enter a material id."),
            React.createElement("p", null, "Materials define how a piece of geometry looks, besides the color texture they also define how the model interacts with light to create highlights and reflections."))),
        React.createElement("div", { className: "mv-sidebar-scroll" },
            data && Object.entries(data.info.texs).map(([name, img]) => (React.createElement("div", { key: name },
                isproc && data && p.ctx && (React.createElement("input", { type: "button", className: "sub-btn", value: "Debug proc", onClick: async () => {
                        let el = await debugProcTexture(p.ctx.sceneCache.engine, img.texid);
                        el.style.position = "initial";
                        showModal({ title: "proc texture " + img.texid, maxWidth: "unset" }, React.createElement(DomWrap, { el: el }));
                    } })),
                React.createElement("div", null,
                    name,
                    " - ",
                    img.texid,
                    " - ",
                    img.filesize > 10000 ? `${img.filesize / 1024 | 0}kb` : `${img.filesize} bytes`,
                    " - ",
                    img.img0.width,
                    "x",
                    img.img0.height),
                React.createElement(ImageDataView, { img: img.img0 })))),
            data?.info.overlay && React.createElement(JsonDisplay, { obj: data?.info.overlay }),
            data?.info.underlay && React.createElement(JsonDisplay, { obj: data?.info.underlay }),
            React.createElement(JsonDisplay, { obj: data?.info.obj }))));
}
function SceneRawModel(p) {
    let [data, model, id, setId] = useAsyncModelData(p.ctx, modelToModel);
    let initid = (typeof p.initialId == "number" ? p.initialId : 0);
    return (React.createElement(React.Fragment, null,
        React.createElement(IdInput, { onChange: setId, initialid: id ?? initid }),
        id == null && (React.createElement(React.Fragment, null,
            React.createElement("p", null, "Enter a model id."),
            React.createElement("p", null, "This lookup shows raw models on their own."))),
        data && (React.createElement("div", { className: "mv-sidebar-scroll" },
            React.createElement(JsonDisplay, { obj: { ...data?.info.modeldata, meshes: undefined } }),
            React.createElement(JsonDisplay, { obj: data?.info.info })))));
}
function SceneLocation(p) {
    const [data, model, id, setId] = useAsyncModelData(p.ctx, locToModel);
    const forceUpdate = useForceUpdate();
    const anim = data?.anims.default ?? -1;
    let initid = id ?? (typeof p.initialId == "number" ? p.initialId : 0);
    return (React.createElement(React.Fragment, null,
        p.ctx && React.createElement(IdInputSearch, { cache: p.ctx.sceneCache.engine, mode: "objects", onChange: setId, initialid: initid }),
        id == null && (React.createElement(React.Fragment, null,
            React.createElement("p", null, "Enter a location id or search by name."),
            React.createElement("p", null, "Locations make up just about everything in the world that isn't a player or NPC."))),
        anim != -1 && React.createElement("label", null,
            React.createElement("input", { type: "checkbox", checked: !model || model.targetAnimId == anim, onChange: e => { model?.setAnimation(e.currentTarget.checked ? anim : -1); forceUpdate(); } }),
            "Animate"),
        React.createElement("div", { className: "mv-sidebar-scroll" },
            React.createElement(JsonDisplay, { obj: data?.info }))));
}
export function updateItemCamera(cam, imgwidth, imgheight, centery, params) {
    const defaultcamdist = 16; //found through testing
    //fov such that the value 32 ends up in the projection matrix.yy
    //not sure if coincidence that this is equal to height
    cam.fov = Math.atan(1 / 32) / (Math.PI / 180) * 2;
    cam.aspect = imgwidth / imgheight;
    cam.updateProjectionMatrix();
    let rot = new Quaternion().setFromEuler(new Euler(-params.rotx / 2048 * 2 * Math.PI, params.roty / 2048 * 2 * Math.PI, -params.rotz / 2048 * 2 * Math.PI, "ZYX"));
    let pos = new Vector3(6, //no clue where the 6 comes from
    0, 4 * -params.zoom);
    let quatx = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), params.rotx / 2048 * 2 * Math.PI);
    let quaty = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -params.roty / 2048 * 2 * Math.PI);
    let quatz = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -params.rotz / 2048 * 2 * Math.PI);
    pos.applyQuaternion(quatx);
    pos.add(new Vector3(-params.translatex * 4, params.translatey * 4, -params.translatey * 4 //yep this is y not z, i don't fucking know
    ));
    pos.applyQuaternion(quaty);
    pos.applyQuaternion(quatz);
    pos.y += centery;
    pos.divideScalar(512);
    pos.z = -pos.z;
    cam.position.copy(pos);
    cam.quaternion.copy(rot);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    return cam;
}
function ItemCameraMode({ ctx, meta, centery }) {
    let [translatex, settranslatex] = React.useState(meta?.modelTranslate_0 ?? 0);
    let [translatey, settranslatey] = React.useState(meta?.modelTranslate_1 ?? 0);
    let [rotx, setrotx] = React.useState(meta?.rotation_0 ?? 0);
    let [roty, setroty] = React.useState(meta?.rotation_1 ?? 0);
    let [rotz, setrotz] = React.useState(meta?.rotation_2 ?? 0);
    let [zoom, setzoom] = React.useState(meta?.model_zoom ?? 2048);
    let [lastmeta, setlastmeta] = React.useState(meta);
    const imgheight = 32;
    const imgwidth = 36;
    let params = { rotx, roty, rotz, translatex, translatey, zoom };
    let reset = () => {
        settranslatex(meta?.modelTranslate_0 ?? 0);
        settranslatey(meta?.modelTranslate_1 ?? 0);
        setrotx(meta?.rotation_0 ?? 0);
        setroty(meta?.rotation_1 ?? 0);
        setrotz(meta?.rotation_2 ?? 0);
        setzoom(meta?.model_zoom ?? 2048);
        setlastmeta(meta);
    };
    if (meta != lastmeta) {
        reset();
    }
    let cam = updateItemCamera(ctx.renderer.getItemCamera(), imgwidth, imgheight, centery, params);
    React.useEffect(() => {
        let el = {
            getSceneElements() {
                return {
                    options: {
                        camMode: "item",
                        // aspect: imgwidth / imgheight
                    }
                };
            },
        };
        ctx.renderer.addSceneElement(el);
        return () => ctx.renderer.removeSceneElement(el);
    }, [cam]);
    ctx.renderer.forceFrame();
    return (React.createElement(React.Fragment, null,
        React.createElement("input", { type: "button", className: "sub-btn", value: "reset", onClick: reset }),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "range", value: rotx, onChange: e => setrotx(+e.currentTarget.value), min: 0, max: 2048, step: 1 }),
                "Rotate x: ",
                rotx)),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "range", value: roty, onChange: e => setroty(+e.currentTarget.value), min: 0, max: 2048, step: 1 }),
                "Rotate y: ",
                roty)),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "range", value: rotz, onChange: e => setrotz(+e.currentTarget.value), min: 0, max: 2048, step: 1 }),
                "Rotate z: ",
                rotz)),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "range", value: zoom, onChange: e => setzoom(+e.currentTarget.value), min: 10, max: 10000, step: 1 }),
                "Zoom: ",
                zoom)),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "range", value: translatex, onChange: e => settranslatex(+e.currentTarget.value), min: -200, max: 208, step: 1 }),
                "Translate x: ",
                translatex)),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "range", value: translatey, onChange: e => settranslatey(+e.currentTarget.value), min: -200, max: 200, step: 1 }),
                "Translate y: ",
                translatey))));
}
function SceneItem(p) {
    let [data, model, id, setId] = useAsyncModelData(p.ctx, itemToModel);
    let initid = id ?? (typeof p.initialId == "number" ? p.initialId : 0);
    let [enablecam, setenablecam] = React.useState(false);
    // let [histfs, sethistfs] = React.useState<UIScriptFS | null>(null);
    let centery = (model?.loaded ? (model.loaded.modeldata.maxy + model.loaded.modeldata.miny) / 2 : 0);
    // let gethistory = async () => {
    // 	if (id == null || !p.ctx) { return; }
    // 	let output = new UIScriptOutput();
    // 	let fs = new UIScriptFS(output);
    // 	sethistfs(fs);
    // 	await output.run(fileHistory, fs, "items", [id], p.ctx.source);
    // }
    return (React.createElement(React.Fragment, null,
        p.ctx && React.createElement(IdInputSearch, { cache: p.ctx.sceneCache.engine, mode: "items", onChange: setId, initialid: initid }),
        id == null && (React.createElement("p", null, "Enter an item id or search by name.")),
        React.createElement("div", { className: "mv-sidebar-scroll" },
            React.createElement("input", { type: "button", className: "sub-btn", value: enablecam ? "exit" : "Icon Camera", onClick: e => setenablecam(!enablecam) }),
            enablecam && p.ctx && React.createElement(ItemCameraMode, { ctx: p.ctx, meta: data?.info, centery: centery }),
            React.createElement(JsonDisplay, { obj: data?.info }))));
}
function SceneNpc(p) {
    const [data, model, id, setId] = useAsyncModelData(p.ctx, npcToModel);
    const forceUpdate = useForceUpdate();
    const initid = id ?? checkObject(p.initialId, { id: "number", head: "boolean" }) ?? { id: 0, head: false };
    return (React.createElement(React.Fragment, null,
        p.ctx && React.createElement(IdInputSearch, { cache: p.ctx.sceneCache.engine, mode: "npcs", onChange: v => setId({ id: v, head: initid.head }), initialid: initid.id }),
        id == null && (React.createElement("p", null, "Enter an NPC id or search by name.")),
        model && data && (React.createElement("label", null,
            React.createElement("input", { type: "checkbox", checked: initid.head, onChange: e => setId({ id: initid.id, head: e.currentTarget.checked }) }),
            "Head")),
        model && data && (React.createElement(LabeledInput, { label: "Animation" },
            React.createElement("select", { onChange: e => { model.setAnimation(+e.currentTarget.value); forceUpdate(); }, value: model.targetAnimId }, Object.entries(data.anims).map(([k, v]) => React.createElement("option", { key: k, value: v }, k))))),
        React.createElement("div", { className: "mv-sidebar-scroll" },
            React.createElement(JsonDisplay, { obj: data?.info }))));
}
function SceneSpotAnim(p) {
    let [data, model, id, setId] = useAsyncModelData(p.ctx, spotAnimToModel);
    let initid = id ?? (typeof p.initialId == "number" ? p.initialId : 0);
    return (React.createElement(React.Fragment, null,
        React.createElement(IdInput, { onChange: setId, initialid: initid }),
        id == null && (React.createElement(React.Fragment, null,
            React.createElement("p", null, "Enter a spotanim id."),
            React.createElement("p", null, "Spotanims are visual effects that are usually temporary and require an extra model that is not part of any loc, npc or player."))),
        React.createElement("div", { className: "mv-sidebar-scroll" },
            React.createElement(JsonDisplay, { obj: data?.info }))));
}
export class SceneMapModel extends React.Component {
    constructor(p) {
        super(p);
        this.selectCleanup = [];
        this.state = {
            chunkgroups: [],
            center: { x: 0, z: 0 },
            toggles: Object.create(null),
            selectionData: undefined,
            versions: [],
            extramodels: false
        };
    }
    clear() {
        this.selectCleanup.forEach(q => q());
        this.state.chunkgroups.forEach(q => q.models.forEach(q => q.cleanup()));
        this.setState({ chunkgroups: [], toggles: Object.create(null) });
    }
    viewmap() {
        showModal({ title: "Map view" }, React.createElement(Map2dView, { chunks: this.state.chunkgroups.map(q => q.models.get(this.props.ctx.sceneCache)).filter(q => q), gridsize: 512, mapscenes: true }));
    }
    async diffCaches(floora = 3, floorb = 3) {
        let group = this.state.chunkgroups[0];
        if (!this.props.ctx || !group) {
            return;
        }
        let arr = [...group.models.entries()];
        if (arr.length != 1 && arr.length != 2) {
            console.log("//TODO can currenly only diff with 1 or 2 caches loaded");
            return;
        }
        let [entrya, entryb] = (arr.length == 1 ? [arr[0], arr[0]] : arr);
        let chunka = await entrya[1].chunkdata;
        let chunkb = await entryb[1].chunkdata;
        let cachea = entrya[0];
        let cacheb = entryb[0];
        if (!chunka.chunk || !chunkb.chunk) {
            throw new Error("unexpected");
        }
        let depsa = await cachea.engine.getDependencyGraph();
        depsa.insertMapChunk(chunka.chunk);
        let depsb = await cacheb.engine.getDependencyGraph();
        depsb.insertMapChunk(chunkb.chunk);
        let floordepsa = mapsquareFloorDependencies(chunka.grid, depsa, chunka.chunk);
        let locdepsa = mapsquareLocDependencies(chunka.grid, depsa, chunka.modeldata, chunka.chunk.mapsquarex, chunka.chunk.mapsquarez);
        let floordepsb = mapsquareFloorDependencies(chunkb.grid, depsb, chunkb.chunk);
        let locdepsb = mapsquareLocDependencies(chunkb.grid, depsb, chunkb.modeldata, chunkb.chunk.mapsquarex, chunkb.chunk.mapsquarez);
        let floordifs = compareFloorDependencies(floordepsa, floordepsb, floora, floorb);
        let locdifs = compareLocDependencies(locdepsa, locdepsb, floora, floorb);
        let floordifmesh = await mapdiffmesh(globalThis.sceneCache, floordifs, [255, 0, 0]);
        let locdifmesh = await mapdiffmesh(globalThis.sceneCache, locdifs, [0, 255, 0]);
        let diffgroup = {
            a: cachea,
            b: cacheb,
            info: {
                floordepsa,
                floordepsb,
                locdepsa,
                locdepsb
            },
            floora,
            floorb,
            visible: true,
            floormesh: {
                getSceneElements() { return { modelnode: (!diffgroup.visible ? undefined : floordifmesh) }; }
            },
            locsmesh: {
                getSceneElements() { return { modelnode: (!diffgroup.visible ? undefined : locdifmesh) }; }
            },
            remove: () => {
                group.diffs = group.diffs.filter(q => q != diffgroup);
                this.props.ctx?.renderer.removeSceneElement(diffgroup.floormesh);
                this.props.ctx?.renderer.removeSceneElement(diffgroup.locsmesh);
                this.forceUpdate();
            }
        };
        this.props.ctx.renderer.addSceneElement(diffgroup.floormesh);
        this.props.ctx.renderer.addSceneElement(diffgroup.locsmesh);
        group.diffs.push(diffgroup);
        this.forceUpdate();
    }
    async meshSelected(e) {
        this.selectCleanup.forEach(q => q());
        let selectionData = undefined;
        if (e) {
            this.selectCleanup = highlightModelGroup(e.vertexgroups);
            //show data about what we clicked
            // console.log(Array.isArray(e.obj.material) ? e.obj.material : e.obj.material.userData);
            let meshdata = e.meshdata;
            if (meshdata.modeltype == "locationgroup") {
                let typedmatch = e.match;
                if (typedmatch.modeltype == "location") {
                    selectionData = typedmatch;
                }
            }
            if (meshdata.modeltype == "floor") {
                let typedmatch = e.match;
                selectionData = {
                    ...e.meshdata,
                    x: typedmatch.x,
                    z: typedmatch.z,
                    subobjects: undefined, //remove (near) circular ref from json
                    subranges: undefined,
                    tile: { ...typedmatch.tile, next01: undefined, next10: undefined, next11: undefined },
                    tilenxt: typedmatch.tilenxt,
                    originalcolor: typedmatch.underlaycolor
                };
            }
        }
        ;
        this.setState({ selectionData });
        this.props.ctx?.renderer.forceFrame();
    }
    componentDidMount() {
        //TODO this is a leak if ctx changes while mounted
        this.props.partial.renderer?.on("select", this.meshSelected);
    }
    componentWillUnmount() {
        this.clear();
        //TODO this is a leak if ctx changes while mounted
        this.props.partial.renderer?.off("select", this.meshSelected);
    }
    async addChunk(chunkx, chunkz) {
        for (let version of this.state.versions) {
            this.loadChunk(chunkx, chunkz, version.cache);
        }
        this.fixVisibility();
    }
    loadChunk(chunkx, chunkz, sceneCache) {
        this.setState(prevstate => {
            const renderer = this.props.ctx?.renderer;
            if (!sceneCache || !renderer) {
                return;
            }
            let chunk = RSMapChunk.create(sceneCache, chunkx, chunkz, { skybox: true, map2d: this.state.extramodels, hashboxes: this.state.extramodels, minimap: this.state.extramodels });
            chunk.on("changed", () => {
                let toggles = this.state.toggles;
                let changed = false;
                let groups = new Set();
                chunk.rootnode.traverse(node => {
                    if (node.userData.modelgroup) {
                        groups.add(node.userData.modelgroup);
                    }
                });
                [...groups].sort((a, b) => a.localeCompare(b)).forEach(q => {
                    if (typeof toggles[q] != "boolean") {
                        toggles[q] = !!q.match(/^(floor|objects)\d+/);
                        // toggles[q] = !!q.match(/^mini_(floor|objects)0/);
                        // toggles[q] = !!q.match(/^mini_(objects)0/);
                        // toggles[q] = !!q.match(/^mini_(floor)0/);
                        changed = true;
                    }
                });
                let match = this.state.versions.find(q => q.cache == sceneCache);
                chunk.setToggles(toggles, match && !match.visible);
                if (changed) {
                    this.setState({ toggles });
                    this.fixVisibility(toggles);
                }
            });
            let center = prevstate.center;
            if (prevstate.chunkgroups.length == 0) {
                let chunksize = (sceneCache.engine.classicData ? classicChunkSize : rs2ChunkSize);
                center = {
                    x: (chunkx + 0.5) * chunksize * 512,
                    z: (chunkz + 0.5) * chunksize * 512,
                };
            }
            let combined = chunk.rootnode;
            combined.position.add(new Vector3(-center.x, 0, -center.z));
            chunk.addToScene(renderer);
            let group = prevstate.chunkgroups.find(q => q.chunkx == chunkx && q.chunkz == chunkz);
            let newstate = {};
            newstate.center = center;
            if (!group) {
                group = { chunkx, chunkz, models: new Map(), diffs: [] };
                newstate.chunkgroups = [...prevstate.chunkgroups, group];
            }
            group.models.set(sceneCache, chunk);
            return newstate; //react typings fail?
        });
    }
    onSubmit(searchtext) {
        localStorage.rsmv_lastsearch = JSON.stringify(searchtext);
        let rect = stringToMapArea(searchtext);
        if (!rect) {
            //TODO some sort of warning?
            return;
        }
        for (let z = rect.z; z < rect.z + rect.zsize; z++) {
            for (let x = rect.x; x < rect.x + rect.xsize; x++) {
                this.addChunk(x, z);
            }
        }
    }
    fixVisibility(newtoggles = this.state.toggles) {
        this.state.chunkgroups.forEach(group => group.models.forEach((q, key) => {
            let match = this.state.versions.find(q => q.cache == key);
            q.setToggles(newtoggles, match && !match.visible);
        }));
    }
    setToggle(toggle, value) {
        this.setState(old => {
            let newtoggles = Object.create(null);
            for (let key in old.toggles) {
                newtoggles[key] = (key == toggle ? value : old.toggles[key]);
            }
            this.fixVisibility(newtoggles);
            return { toggles: newtoggles };
        });
    }
    selectSecondCache() {
        let onselect = async (source) => {
            frame.close();
            let cache = await openSavedCache(source, false);
            if (!cache) {
                return;
            }
            let engine = await EngineCache.create(cache);
            let scene = await ThreejsSceneCache.create(engine);
            for (let area of this.state.chunkgroups) {
                this.loadChunk(area.chunkx, area.chunkz, scene);
            }
            this.setState({ versions: [...this.state.versions, { cache: scene, visible: true }] });
        };
        let frame = showModal({ title: "Select a cache" }, (React.createElement(CacheSelector, { onOpen: onselect, noReopen: true })));
    }
    removeCache(cache) {
        for (let group of this.state.chunkgroups) {
            let model = group.models.get(cache);
            if (!model) {
                continue;
            }
            this.props.ctx?.renderer.removeSceneElement(model);
        }
        this.setState({ versions: this.state.versions.filter(q => q.cache != cache) });
    }
    toggleCache() {
        let currentindex = this.state.versions.findIndex(q => q.visible);
        let newindex = (currentindex + 1) % this.state.versions.length;
        this.state.versions.forEach((q, i) => this.toggleVisible(q.cache, i == newindex));
    }
    toggleVisible(cache, visible) {
        let entry = this.state.versions.find(q => q.cache == cache);
        if (!entry) {
            return;
        }
        entry.visible = visible;
        this.forceUpdate();
        this.fixVisibility();
    }
    static getDerivedStateFromProps(props, state) {
        if (props.ctx && !state.versions.find(q => q.cache == props.ctx?.sceneCache)) {
            return { versions: [{ cache: props.ctx.sceneCache, visible: true }, ...state.versions] };
        }
        return null;
    }
    render() {
        this.props.ctx?.renderer.forceFrame();
        let toggles = {};
        for (let toggle of Object.keys(this.state.toggles)) {
            let m = toggle.match(/^(\D+?)(\d.*)?$/);
            if (!m) {
                throw new Error("???");
            }
            toggles[m[1]] = toggles[m[1]] ?? [];
            toggles[m[1]].push(m[2] ?? "");
        }
        let xmin = Infinity, xmax = -Infinity;
        let zmin = Infinity, zmax = -Infinity;
        for (let chunk of this.state.chunkgroups) {
            xmin = Math.min(xmin, chunk.chunkx);
            xmax = Math.max(xmax, chunk.chunkx + 1);
            zmin = Math.min(zmin, chunk.chunkz);
            zmax = Math.max(zmax, chunk.chunkz + 1);
        }
        let xsize = xmax - xmin + 2;
        let zsize = zmax - zmin + 2;
        xmin--;
        zmin--;
        let addgrid = [];
        for (let x = xmin; x < xmin + xsize; x++) {
            for (let z = zmin; z < zmin + zsize; z++) {
                let style = {
                    gridColumn: "" + (x - xmin + 1),
                    gridRow: "" + (zmin + zsize - z),
                    border: "1px solid rgba(255,255,255,0.2)"
                };
                addgrid.push(React.createElement("div", { key: `${x}-${z}`, onClick: () => this.addChunk(x, z), style: style }));
            }
        }
        let initid = (typeof this.props.initialId == "string" ? this.props.initialId : "50,50,1,1");
        //find the last skybox
        let skysettings = this.state.chunkgroups.reduceRight((a, q) => a ?? q.models.get(this.props.ctx.sceneCache)?.loaded?.sky, undefined);
        return (React.createElement(React.Fragment, null,
            this.state.chunkgroups.length == 0 && (React.createElement(React.Fragment, null,
                React.createElement(StringInput, { onChange: this.onSubmit, initialid: initid }),
                React.createElement("label", null,
                    React.createElement("input", { type: "checkbox", checked: this.state.extramodels, onChange: e => this.setState({ extramodels: e.currentTarget.checked }) }),
                    "Load extra modes"),
                React.createElement("p", null, "Input format: x,z[,xsize=1,[zsize=xsize]]"),
                React.createElement("p", null, "Coordinates are in so-called mapsquare coordinates, each mapsquare is 64x64 tiles in size. The entire RuneScape map is laid out in one plane and is 100x200 mapsquares in size."))),
            this.state.chunkgroups.length != 0 && (React.createElement("div", { className: "mv-sidebar-scroll" },
                React.createElement(Map2dView, { chunks: this.state.chunkgroups.map(q => q.models.get(this.props.ctx.sceneCache)).filter(q => q), addArea: this.addChunk, gridsize: 40, mapscenes: false }),
                React.createElement("input", { type: "button", className: "sub-btn", onClick: this.clear, value: "Clear" }),
                React.createElement("input", { type: "button", className: "sub-btn", onClick: this.viewmap, value: "View Map" }),
                React.createElement("input", { type: "button", className: "sub-btn", value: "Add other version", onClick: this.selectSecondCache }),
                skysettings && (React.createElement("div", null,
                    "Skybox model: ",
                    React.createElement("span", { className: "mv-copy-text" }, skysettings.skyboxModelid),
                    ", fog: ",
                    React.createElement("span", { className: "mv-copy-text" },
                        skysettings.fogColor[0],
                        ",",
                        skysettings.fogColor[1],
                        ",",
                        skysettings.fogColor[2]))),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,max-content)" } }, Object.entries(toggles).map(([base, subs]) => {
                    let all = true;
                    let none = true;
                    subs.forEach(s => {
                        let v = this.state.toggles[base + s];
                        all && (all = v);
                        none && (none = !v);
                    });
                    return (React.createElement(React.Fragment, { key: base },
                        React.createElement("label", { style: { gridColumn: 1 } },
                            React.createElement("input", { type: "checkbox", checked: all, onChange: e => subs.forEach(s => this.setToggle(base + s, e.currentTarget.checked)), ref: v => v && (v.indeterminate = !all && !none) }),
                            base),
                        subs.map((sub, i) => {
                            let name = base + sub;
                            let value = this.state.toggles[name];
                            return (React.createElement("label", { key: sub, style: { gridColumn: 2 + i } },
                                React.createElement("input", { type: "checkbox", checked: value, onChange: e => this.setToggle(name, e.currentTarget.checked) }),
                                sub));
                        })));
                })),
                (this.state.versions.length > 1 || !this.state.versions[0].visible) && "Versions",
                (this.state.versions.length > 1 || !this.state.versions[0].visible) && this.state.versions.map((q, i) => (React.createElement("div", { key: i, style: { clear: "both" } },
                    React.createElement("label", { title: q.cache.engine.getCacheMeta().descr },
                        React.createElement("input", { type: "checkbox", checked: q.visible, onChange: e => this.toggleVisible(q.cache, e.currentTarget.checked) }),
                        q.cache.engine.getCacheMeta().name),
                    React.createElement("input", { type: "button", className: "sub-btn", value: "x", style: { float: "right" }, onClick: e => this.removeCache(q.cache) })))),
                this.state.versions.length > 1 && React.createElement("input", { type: "button", className: "sub-btn", value: "Toggle", onClick: this.toggleCache }),
                this.state.chunkgroups.flatMap((group, groupi) => group.diffs.map((diff, i) => {
                    let metaa = diff.a.engine.getCacheMeta();
                    let metab = diff.a == diff.b ? metaa : diff.b.engine.getCacheMeta();
                    return (React.createElement("div", { key: groupi + "-" + i, style: { clear: "both" } },
                        React.createElement("label", { title: diff.a == diff.b ? metaa.descr : `cache a:${metaa.descr}\n\n${metab.descr}` },
                            React.createElement("input", { type: "checkbox", checked: diff.visible, onChange: e => { diff.visible = e.currentTarget.checked; this.props.ctx?.renderer.sceneElementsChanged(); this.forceUpdate(); } }),
                            diff.a.engine.getBuildNr(),
                            ", floor: ",
                            diff.floora,
                            "-",
                            diff.b.engine.getBuildNr(),
                            ", floor: ",
                            diff.floorb),
                        React.createElement("input", { type: "button", className: "sub-btn", onClick: diff.remove, style: { float: "right" }, value: "x" })));
                })),
                React.createElement(JsonDisplay, { obj: this.state.selectionData })))));
    }
}
__decorate([
    boundMethod
], SceneMapModel.prototype, "clear", null);
__decorate([
    boundMethod
], SceneMapModel.prototype, "viewmap", null);
__decorate([
    boundMethod
], SceneMapModel.prototype, "meshSelected", null);
__decorate([
    boundMethod
], SceneMapModel.prototype, "addChunk", null);
__decorate([
    boundMethod
], SceneMapModel.prototype, "onSubmit", null);
__decorate([
    boundMethod
], SceneMapModel.prototype, "selectSecondCache", null);
__decorate([
    boundMethod
], SceneMapModel.prototype, "toggleCache", null);
export class Map2dView extends React.Component {
    constructor(p) {
        super(p);
        this.state = {
            cache: new Map()
        };
    }
    render() {
        let xmin = Infinity, xmax = -Infinity;
        let zmin = Infinity, zmax = -Infinity;
        for (let chunk of this.props.chunks) {
            xmin = Math.min(xmin, chunk.chunkx);
            xmax = Math.max(xmax, chunk.chunkx + 1);
            zmin = Math.min(zmin, chunk.chunkz);
            zmax = Math.max(zmax, chunk.chunkz + 1);
        }
        let xsize = xmax - xmin + 2;
        let zsize = zmax - zmin + 2;
        xmin--;
        zmin--;
        let addgrid = [];
        for (let x = xmin; x < xmin + xsize; x++) {
            for (let z = zmin; z < zmin + zsize; z++) {
                let style = {
                    gridColumn: "" + (x - xmin + 1),
                    gridRow: "" + (zmin + zsize - z),
                    border: "1px solid rgba(255,255,255,0.2)"
                };
                addgrid.push(React.createElement("div", { key: `${x}-${z}`, onClick: () => this.props.addArea?.(x, z), style: style }));
            }
        }
        let gridsize = this.props.gridsize;
        let pad = 20;
        return (React.createElement("div", { className: "map-grid-container" },
            React.createElement("div", { className: "map-grid-root", style: { gridTemplateColumns: `${pad}px repeat(${xsize - 2},${gridsize}px) ${pad}px`, gridTemplateRows: `${pad}px repeat(${zsize - 2},${gridsize}px) ${pad}px` } },
                this.props.chunks.flatMap((chunk, i) => {
                    let style = {
                        gridColumn: `${chunk.chunkx - xmin + 1}/span ${1}`,
                        gridRow: `${zsize - (chunk.chunkz - zmin)}/span ${1}`
                    };
                    let cached = this.state.cache.get(chunk);
                    if (cached?.src) {
                        style.backgroundImage = cached.src;
                    }
                    else if (!cached) {
                        let prom = chunk.renderSvg(0, false);
                        cached = { render: prom, src: null };
                        this.state.cache.set(chunk, cached);
                        prom.then(svg => {
                            cached.src = `url("data:image/svg+xml;base64,${btoa(svg)}")`;
                            this.forceUpdate();
                        });
                    }
                    addgrid[(chunk.chunkx - xmin) * zsize + (chunk.chunkz - zmin)] = null;
                    return (React.createElement("div", { key: i, className: classNames("map-grid-area", { "map-grid-area-loading": !cached?.src }), style: style },
                        chunk.chunkx,
                        ",",
                        chunk.chunkz));
                }),
                addgrid)));
    }
}
function PreviewFilesScript(p) {
    let [] = p.initialArgs.split(":");
    let run = () => {
        let output = new UIScriptOutput();
        let outdir = output.makefs("out");
        output.run(previewAllFileTypes, outdir, p.source);
        p.onRun(output, ``);
    };
    return (React.createElement(React.Fragment, null,
        React.createElement("p", null, "Extracts a couple example files for each known extraction mode."),
        React.createElement("input", { type: "button", className: "sub-btn", value: "Run", onClick: run })));
}
function ModeDropDownOptions() {
    return (React.createElement(React.Fragment, null, Object.entries(cacheFileDecodeGroups).map(([k, v]) => (React.createElement("optgroup", { key: k, label: k }, Object.keys(v).map(k => React.createElement("option", { key: k, value: k }, k)))))));
}
function ExtractFilesScript(p) {
    let [initmode, initbatched, initdecoder, initfilestext] = p.initialArgs.split(":");
    let [filestext, setFilestext] = React.useState(initfilestext ?? "");
    let [mode, setMode] = React.useState(initmode || "items");
    let [batched, setbatched] = React.useState(initbatched == "true");
    let [decoderflags, setdecodersflags] = React.useState((initdecoder ? Object.fromEntries(initdecoder.split(",").map(q => [q.split("=")[0], q.split("=")[1] ?? ""])) : {}));
    let run = () => {
        let output = new UIScriptOutput();
        let outdir = output.makefs("out");
        let files = stringToFileRange(filestext);
        output.run(extractCacheFiles, outdir, p.source, { files, mode, batched, batchlimit: -1, edit: false, skipread: false }, decoderflags);
        p.onRun(output, `${mode}:${batched}:${Object.entries(decoderflags).map(([k, v]) => `${k}=${v}`).join(",")}:${filestext}`);
    };
    let modemeta = React.useMemo(() => cacheFileDecodeModes[mode]?.({}), [mode]);
    let setFlag = (flag, v) => {
        let newflags = { ...decoderflags };
        if (v) {
            newflags[flag] = "true";
        }
        else {
            delete newflags[flag];
        }
        setdecodersflags(newflags);
    };
    return (React.createElement(React.Fragment, null,
        React.createElement("p", null,
            "Extract files from the cache.",
            React.createElement("br", null),
            "The ranges field uses logical file id's for JSON based files, ",
            "<major>.<minor>",
            " notation for bin mode, or ",
            "<x>.<z>",
            " for map based files."),
        React.createElement(LabeledInput, { label: "Mode" },
            React.createElement("select", { value: mode, onChange: e => setMode(e.currentTarget.value) },
                React.createElement(ModeDropDownOptions, null))),
        React.createElement(LabeledInput, { label: "File ranges" },
            React.createElement(InputCommitted, { type: "text", onChange: e => setFilestext(e.currentTarget.value), value: filestext })),
        React.createElement("div", null, modemeta?.description ?? ""),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: batched, onChange: e => setbatched(e.currentTarget.checked) }),
                "Concatenate group files")),
        Object.entries(modemeta?.flagtemplate ?? {}).map(([k, v]) => (React.createElement("div", { key: k },
            React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: decoderflags[k] == "true", onChange: e => setFlag(k, e.currentTarget.checked) }),
                v.text)))),
        React.createElement("input", { type: "button", className: "sub-btn", value: "Run", onClick: run })));
}
function ExtractHistoricScript(p) {
    let [initmode, initfilestext, initcacheids] = p.initialArgs.split(":");
    let [filestext, setFilestext] = React.useState(initfilestext ?? "");
    let [buildnrs, setbuildnrs] = React.useState(initcacheids ?? "");
    let [mode, setMode] = React.useState(initmode || "items");
    let run = () => {
        let output = new UIScriptOutput();
        let outdir = output.makefs("out");
        let builds = stringToFileRange(buildnrs);
        let files = stringToFileRange(filestext);
        output.run(fileHistory, outdir, mode, files[0].start, null, builds);
        p.onRun(output, `${mode}:${filestext}:${buildnrs}`);
    };
    return (React.createElement(React.Fragment, null,
        React.createElement("p", null,
            "Tracks a single file's update history using openrs2 caches. Each known cache will be compared and all changes are shown. ",
            "<major>.<minor>",
            " notation for bin mode, or ",
            "<x>.<z>",
            " for map based files."),
        React.createElement(LabeledInput, { label: "Mode" },
            React.createElement("select", { value: mode, onChange: e => setMode(e.currentTarget.value) },
                React.createElement(ModeDropDownOptions, null))),
        React.createElement(LabeledInput, { label: "File ranges" },
            React.createElement(InputCommitted, { type: "text", onChange: e => setFilestext(e.currentTarget.value), value: filestext })),
        React.createElement(LabeledInput, { label: "Build numbers (empty for all)" },
            React.createElement("input", { type: "text", value: buildnrs, onChange: e => setbuildnrs(e.currentTarget.value) })),
        React.createElement("input", { type: "button", className: "sub-btn", value: "Run", onClick: run })));
}
//not currently exposed, needs some fixing or just delete
function MapRemoteRenderScript(p) {
    let [endpoint, setEndpoint] = React.useState(localStorage.rsmv_script_map_endpoint ?? "");
    let [auth, setAuth] = React.useState("");
    let [mapid, setMapId] = React.useState(0);
    let run = async () => {
        let output = new UIScriptOutput();
        let config = await MapRenderDatabaseBacked.create(endpoint, auth, mapid, false, new Date(0));
        localStorage.rsmv_script_map_endpoint = endpoint;
        output.run(runMapRender, p.source, config, true);
        p.onRun(output, "");
    };
    return (React.createElement(React.Fragment, null,
        React.createElement("p", null, "Update a map database, requires compatible server endpoint."),
        React.createElement(LabeledInput, { label: "Endpoint" },
            React.createElement(InputCommitted, { type: "text", onChange: e => setEndpoint(e.currentTarget.value), value: endpoint })),
        React.createElement(LabeledInput, { label: "Auth" },
            React.createElement(InputCommitted, { type: "text", onChange: e => setAuth(e.currentTarget.value), value: auth })),
        React.createElement(LabeledInput, { label: "mapid" },
            React.createElement(InputCommitted, { type: "number", onChange: e => setMapId(+e.currentTarget.value), value: mapid })),
        React.createElement("input", { type: "button", className: "sub-btn", value: "Run", onClick: run })));
}
function MaprenderScript(p) {
    let [configjson, setconfigjson] = React.useState(localStorage.rsmv_script_map_lastconfig || examplemapconfig);
    let run = async () => {
        localStorage.rsmv_script_map_lastconfig = (configjson == examplemapconfig ? "" : configjson);
        let output = new UIScriptOutput();
        let fs = output.makefs("render");
        let config = new MapRenderFsBacked(fs, parseMapConfig(configjson));
        await fs.writeFile("mapconfig.jsonc", configjson);
        output.run(runMapRender, p.source, config, true);
        p.onRun(output, "");
    };
    let editconfig = () => {
        let modal = showModal({ title: "Map render config" }, (React.createElement("form", { style: { display: "flex", flexDirection: "column", height: "100%" } },
            React.createElement("textarea", { name: "parsertext", defaultValue: configjson, style: { flex: "1000px 1 1", resize: "none", whiteSpace: "nowrap" } }),
            React.createElement("input", { type: "button", className: "sub-btn", value: "Confirm", onClick: e => { setconfigjson(e.currentTarget.form.parsertext.value); modal.close(); } }))));
    };
    return (React.createElement(React.Fragment, null,
        React.createElement("p", null, "Render 3d world map. (there is a CLI version of this command which is much more performant)"),
        React.createElement("div", null,
            React.createElement("input", { type: "button", className: "sub-btn", value: "Edit Config", onClick: editconfig }),
            configjson != examplemapconfig && React.createElement("input", { type: "button", className: "sub-btn", value: "Reset", onClick: e => setconfigjson(examplemapconfig) })),
        React.createElement("input", { type: "button", className: "sub-btn", value: "Run", onClick: run })));
}
function CacheDiffScript(p) {
    let [cache2, setCache2] = React.useState(null);
    let [selectopen, setSelectopen] = React.useState(false);
    let [result, setResult] = React.useState(null);
    let [filerange, setFilerange] = React.useState("");
    let [showmodels, setshowmodels] = React.useState(false);
    let openCache = async (s) => {
        setSelectopen(false);
        setCache2(await openSavedCache(s, false));
    };
    React.useEffect(() => () => cache2?.close(), [cache2]);
    let run = async () => {
        if (!cache2) {
            return;
        }
        let output = new UIScriptOutput();
        let outdir = output.makefs("diff");
        let files = stringToFileRange(filerange);
        p.onRun(output, "");
        let res = output.run(diffCaches, outdir, cache2, p.source, files);
        res.then(setResult);
    };
    let clickOpen = () => {
        let frame = showModal({ title: "Select a cache" }, (React.createElement(CacheSelector, { onOpen: v => { openCache(v); frame.close(); }, noReopen: true })));
    };
    React.useEffect(() => {
        if (result && showmodels && cache2 && p.ctx.sceneCache) {
            let prom = EngineCache.create(cache2).then(async (engine) => {
                let oldscene = await ThreejsSceneCache.create(engine);
                let models = [];
                const xstep = 5 * 512;
                const zstep = 5 * 512;
                let modelcount = 0;
                for (let diff of result) {
                    if (diff.major == cacheMajors.models) {
                        if (diff.before) {
                            let model = new RSModel(oldscene, [{ modelid: diff.minor, mods: {} }], `before ${diff.minor}`);
                            model.rootnode.position.set(modelcount * xstep, 0, zstep);
                            models.push(model);
                            model.addToScene(p.ctx.renderer);
                        }
                        if (diff.after) {
                            let model = new RSModel(p.ctx.sceneCache, [{ modelid: diff.minor, mods: {} }], `after ${diff.minor}`);
                            model.rootnode.position.set(modelcount * xstep, 0, 0);
                            models.push(model);
                            model.addToScene(p.ctx.renderer);
                        }
                        modelcount++;
                    }
                }
                return models;
            });
            return () => {
                prom.then(models => models.forEach(q => q.cleanup()));
            };
        }
    }, [result, showmodels]);
    return (React.createElement(React.Fragment, null,
        React.createElement("p", null, "Shows all changes between the current cache and a second cache."),
        !cache2 && !selectopen && React.createElement("input", { type: "button", className: "sub-btn", value: "Select second cache", onClick: e => clickOpen() }),
        !cache2 && selectopen && (React.createElement("div", { style: { backgroundColor: "rgba(0,0,0,0.3)" } },
            React.createElement("input", { type: "button", className: "sub-btn", value: "Cancel select cache", onClick: e => setSelectopen(false) }),
            React.createElement(CacheSelector, { onOpen: openCache }))),
        cache2 && React.createElement("input", { type: "button", className: "sub-btn", value: `Close ${cache2.getCacheMeta().name}`, onClick: e => setCache2(null) }),
        React.createElement(LabeledInput, { label: "file range" },
            React.createElement("input", { type: "text", onChange: e => setFilerange(e.currentTarget.value), value: filerange })),
        React.createElement("input", { type: "button", className: "sub-btn", value: "Run", onClick: run }),
        result && React.createElement("label", null,
            React.createElement("input", { checked: showmodels, onChange: e => setshowmodels(e.currentTarget.checked), type: "checkbox" }),
            "View changed models")));
}
function TestFilesScript(p) {
    let [initmode, initrange, initdumpall, initordersize] = p.initialArgs.split(":");
    let [mode, setMode] = React.useState(initmode || "");
    let [range, setRange] = React.useState(initrange || "");
    let [dumpall, setDumpall] = React.useState(initdumpall != "false");
    let [ordersize, setOrdersize] = React.useState(initordersize == "true");
    let [customparser, setCustomparser] = React.useState("");
    let run = () => {
        let modeobj = cacheFileJsonModes[mode];
        if (!modeobj) {
            return;
        }
        let output = new UIScriptOutput();
        let outdir = output.makefs("output");
        let opts = defaultTestDecodeOpts();
        opts.maxerrs = 50000;
        opts.orderBySize = ordersize;
        opts.dumpall = dumpall;
        if (customparser) {
            modeobj = { ...modeobj };
            modeobj.parser = FileParser.fromJson(customparser);
        }
        output.run(testDecode, outdir, p.source, modeobj, stringToFileRange(range), opts);
        p.onRun(output, `${mode}:${range}:${dumpall}:${ordersize}`);
    };
    let customparserUi = React.useCallback(() => {
        let srctext = customparser || cacheFileJsonModes[mode].parser.originalSource;
        let modal = showModal({ title: "Edit parser" }, (React.createElement("form", { style: { display: "flex", flexDirection: "column", height: "100%" } },
            React.createElement("textarea", { name: "parsertext", defaultValue: srctext, style: { flex: "1000px 1 1", resize: "none", whiteSpace: "nowrap" } }),
            React.createElement("input", { type: "button", className: "sub-btn", value: "Confirm", onClick: e => { setCustomparser(e.currentTarget.form.parsertext.value); modal.close(); } }))));
        // txtarea.style.cssText = "position:absolute;top:0px;left:0px;right:0px;bottom:20px;";
    }, [customparser, mode]);
    return (React.createElement(React.Fragment, null,
        React.createElement("p", null, "Run this script to test if the current cache parser is compatible with the loaded cache. Generates readable errors if not."),
        React.createElement(LabeledInput, { label: "Mode" },
            React.createElement("select", { value: mode, onChange: e => setMode(e.currentTarget.value) }, Object.keys(cacheFileJsonModes).map(k => React.createElement("option", { key: k, value: k }, k)))),
        React.createElement(LabeledInput, { label: "file range" },
            React.createElement("input", { type: "text", onChange: e => setRange(e.currentTarget.value), value: range })),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: ordersize, onChange: e => setOrdersize(e.currentTarget.checked) }),
                "Order by size (puts everything in mem)")),
        React.createElement("div", null,
            React.createElement("label", null,
                React.createElement("input", { type: "checkbox", checked: dumpall, onChange: e => setDumpall(e.currentTarget.checked) }),
                "Output successes as well")),
        React.createElement("br", null),
        React.createElement("input", { type: "button", className: "sub-btn", value: "Edit parser", onClick: customparserUi }),
        customparser && React.createElement("input", { type: "button", className: "sub-btn", value: "Reset", onClick: () => setCustomparser("") }),
        React.createElement("br", null),
        React.createElement("input", { type: "button", className: "sub-btn", value: "Run", onClick: run })));
}
function RawCliScript(p) {
    let [text, setText] = React.useState(p.initialArgs);
    let run = async () => {
        let output = new UIScriptOutput();
        let ctx = {
            getConsole() { return output; },
            getFs(name) { return output.makefs(name); },
            getDefaultCache() { return p.source; }
        };
        p.onRun(output, text);
        let api = cliApi(ctx);
        let res = await cmdts.runSafely(api.subcommands, text.split(/\s+/g));
        if (output.state == "running") {
            output.setState(res._tag == "error" ? "error" : "done");
        }
        if (res._tag == "error") {
            output.log(res.error.config.message);
        }
        else {
            output.log("script done");
        }
    };
    return (React.createElement(React.Fragment, null,
        React.createElement("p", null, "Run CLI code"),
        React.createElement("input", { type: "text", value: text, onInput: e => setText(e.currentTarget.value) }),
        React.createElement("input", { type: "button", className: "sub-btn", value: "Run", onClick: run })));
}
const uiScripts = {
    test: TestFilesScript,
    extract: ExtractFilesScript,
    preview: PreviewFilesScript,
    historic: ExtractHistoricScript,
    maprender: MaprenderScript,
    diff: CacheDiffScript,
    cli: RawCliScript
};
function ScriptsUI(p) {
    let initialscript = "test";
    let initialargs = "";
    if (typeof p.initialId == "string") {
        [initialscript, initialargs] = p.initialId.split(/(?<=^[^:]*):/);
    }
    let [script, setScript] = React.useState(initialscript);
    let [running, setRunning] = React.useState(null);
    let onRun = React.useCallback((output, savedargs) => {
        localStorage.rsmv_lastsearch = JSON.stringify(script + ":" + savedargs);
        setRunning(output);
    }, [script]);
    const source = p.partial.source;
    if (!source) {
        throw new Error("trying to render modelbrowser without source loaded");
    }
    const SelectedScript = uiScripts[script];
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { className: "mv-sidebar-scroll" },
            React.createElement("h2", null, "Script runner"),
            React.createElement(TabStrip, { value: script, tabs: Object.fromEntries(Object.keys(uiScripts).map(k => [k, k])), onChange: v => setScript(v) }),
            !SelectedScript && (React.createElement(React.Fragment, null,
                React.createElement("p", null, "Select a script"),
                React.createElement("p", null, "The script runner allows you to run some of the CLI scripts directly from the browser."))),
            SelectedScript && React.createElement(SelectedScript, { source: source, onRun: onRun, initialArgs: initialscript == script ? (initialargs ?? "") : "", ctx: p.partial }),
            React.createElement("h2", null, "Script output"),
            React.createElement(OutputUI, { output: running, ctx: p.partial }))));
}
const LookupModeComponentMap = {
    model: SceneRawModel,
    item: SceneItem,
    avatar: ScenePlayer,
    material: SceneMaterialIsh,
    npc: SceneNpc,
    object: SceneLocation,
    spotanim: SceneSpotAnim,
    map: SceneMapModel,
    scenario: SceneScenario,
    scripts: ScriptsUI
};

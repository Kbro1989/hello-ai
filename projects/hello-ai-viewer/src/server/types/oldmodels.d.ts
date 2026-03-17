// Manually defined type for oldmodels to bypass build script issues
// Based on src/opcodes/oldmodels.jsonc

export type TexFlag = {
    type: 0;
    vertindex: number;
} | {
    type: 1;
    projection: number;
    speed: number;
} | {
    type: 2;
    projection: number;
    speed: number;
} | {
    type: 3;
    projection: number;
    speed: number;
};

export type oldmodels = {
    footbytes: number;
    colanimcount: number;
    unkcount0: number;
    uvcount: number;
    indexbufsize: number;
    zsize: number;
    ysize: number;
    xsize: number;
    hasbones: boolean;
    hasmaterials: boolean;
    flag3: boolean;
    hasalpha: boolean;
    priority: number;
    extraflags: number;
    texmapcount: number;
    facecount: number;
    vertcount: number;
    header1: number;
    header2: number;
    modelversion: number;
    vertdatasize: number;
    texmap_vertcount: number;
    texmap_projectioncount: number;
    texmap_transsize: number;
    texflags: TexFlag[];
    vertflags: Buffer;
    mode_1: Buffer | null;
    tritype: Buffer;
    facepriority: Buffer;
    unk1: Buffer | null;
    mode_2: Buffer | null;
    boneids: Buffer | null;
    alpha: Buffer | null;
    indexbuffer: Buffer;
    material: Buffer | null;
    uvs: Buffer;
    colors: Buffer;
    texmap_verts_1: [number, number, number][] | null;
    posx: Buffer;
    posy: Buffer;
    posz: Buffer;
    texmap_verts_2: [number, number, number][] | null;
    texmap_projections: {
        normal: [number, number, number];
        scale: [number, number, number];
        rotation: number;
        direction: number;
    }[];
    texmap_translates: Buffer;
    particles: {
        texture: number;
        faceid: number;
    }[] | null;
    effectors: {
        effector: number;
        vertex: number;
    }[] | null;
    billboards: {
        unk1: number;
        unk2: number;
        unk3: number;
        unk4: number;
    }[] | null;
    texuvs: {
        headoffset: number;
        indexsize: number;
        datasize: number;
        coordcount: number;
        index: Buffer;
        vertex: Buffer;
        udata: number[];
        vdata: number[];
    } | null;
    unusedendbytes: ([number, number, number, number][] | null) | null;
};

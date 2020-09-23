

window.$ = $;

var canvaSize;

var userAlgorithm = null;

var pipeline = null;

var loadedCanvasCount;

var promptStart, showError, showLoading, hideError, hideLoading, saveAlgorithm;

var global_frequency, global_volume;

function str2bin(str) {
    var result = [];
    for (var i = 0; i < str.length; i++) {
        result.push(str.charCodeAt(i));
    }
    return result;
}

function bin2str(array) {
    return String.fromCharCode.apply(String, array);
}

var is_safari = (navigator.userAgent.indexOf("iPhone") > -1 || navigator.userAgent.indexOf("iPad") > -1 || navigator.userAgent.indexOf("Safari") > -1) && navigator.userAgent.indexOf("Chrome") == -1;

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
            window.setTimeout(callback, 1000 / 60);
        };
})();


var api_names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];

var OpenGLPipeline = function (pipleline_proto) { // "Constructor."
    this.currentContext = 0;
    this.contexts = [];
    this.cached_contexts = [];

    if (pipleline_proto.contexts)
        for (var i = 0; i < pipleline_proto.contexts.length; i++)
            this.addContext(pipleline_proto.contexts[i]);

    this.programs = [];
    this.cached_programs = [];

    if (pipleline_proto.programs)
        for (var i = 0; i < pipleline_proto.programs.length; i++)
            this.addProgram(pipleline_proto.programs[i]);

    this.stages = [];
    this.cached_stages = [];

    if (pipleline_proto.stages)
        for (var i = 0; i < pipleline_proto.stages.length; i++)
            this.addStage(pipleline_proto.stages[i]);
};

var OpenGLDimension = function () {
    this.type = 0;
}

OpenGLDimension.Type = {
    SCREEN_SIZE: 0,
    NEXT_LOWEST_POWER_OF_TWO: 1,
    NEXT_HIGHEST_POWER_OF_TWO: 2,
    EXACT: 3
}

OpenGLPipeline.prototype.addContext = function (context_proto) {
    var context = new OpenGLContext(context_proto);
    this.contexts.push(context);
};

OpenGLPipeline.prototype.addProgram = function (program_proto) {
    var program = new OpenGLProgram(program_proto);
    this.programs.push(program);
};

OpenGLPipeline.prototype.addStage = function (stage_proto) {
    var stage = new OpenGLStage(stage_proto);
    this.stages.push(stage);
};

OpenGLPipeline.prototype.renderLoop = function () {
    this.currentContext++;
    this.anim = {
        renderLoop: (function (x) {
            this.render(x);
            if (x == this.currentContext)
                window.requestAnimationFrame(this.anim.renderLoop.bind(this.anim, x));
        }).bind(this)
    };
    this.anim.renderLoop(this.currentContext);
}
OpenGLPipeline.prototype.getProgram = function (name) {

    for (var i = 0; i < this.programs.length; i++)
        if (this.programs[i].program.name == name)
            return this.programs[i];
    return null;
}
OpenGLPipeline.prototype.getContext = function (name) {
    for (var i = 0; i < this.contexts.length; i++)
        if (this.contexts[i].context.name == name)
            return this.contexts[i];
    return null;
}

OpenGLPipeline.prototype.render = function (lastContext) {
    for (var i = 0; i < this.stages.length; i++)
        this.getContext(this.stages[i].stage.context_name).render(this.getProgram(this.stages[i].stage.program_name), this.stages[i]);
}

OpenGLPipeline.prototype.destroy = function () {
    this.currentContext++;

    for (var i = 0; i < this.stages.length; i++)
        this.stages[i].destroy();
    for (var i = 0; i < this.cached_stages.length; i++)
        this.cached_stages[i].destroy();

    this.stages = [];
    this.cached_stages = [];
}

OpenGLPipeline.prototype.setProto = function (new_proto) {

    //this.destroy();

    var new_contexts = new_proto.contexts;

    if (new_contexts) {
        if (this.contexts) {
            if (this.contexts.length > new_contexts.length) {
                var spliced = this.contexts.splice(new_contexts.length, this.contexts.length - new_contexts.length);
                for (var i = 0; i < spliced.length; i++)
                    this.cached_contexts.push(spliced[i]);
            }
            else if (this.contexts.length == new_contexts.length) {
                //NO OP
            }
            else {
                while (this.cached_contexts.length > 0 && this.contexts.length < new_contexts.length)
                    this.contexts.push(this.cached_contexts.splice(0, 1)[0]);
                while (this.contexts.length < new_contexts.length)
                    this.contexts.push(new OpenGLContext());
            }

            for (var i = 0; i < this.contexts.length; i++) {
                if (this.contexts[i].gl && this.contexts[i].cached_programs) {
                    this.contexts[i].gl.useProgram(null);
                    for (var name in this.contexts[i].cached_programs) {
                        this.contexts[i].gl.deleteProgram(this.contexts[i].cached_programs[name]);
                    }
                    this.contexts[i].cached_programs = {};
                }
            }

            for (var i = 0; i < new_contexts.length; i++)
                this.contexts[i].setProto(new_contexts[i]);
        }
    }


    var new_programs = new_proto.programs;

    if (new_programs) {
        if (this.programs) {
            if (this.programs.length > new_programs.length) {
                var spliced = this.programs.splice(new_programs.length, this.programs.length - new_programs.length);
                for (var i = 0; i < spliced.length; i++)
                    this.cached_programs.push(spliced[i]);
            }
            else if (this.programs.length == new_programs.length) {
                //NO OP
            }
            else {
                while (this.cached_programs.length > 0 && this.programs.length < new_programs.length)
                    this.programs.push(this.cached_programs.splice(0, 1)[0]);
                while (this.programs.length < new_programs.length)
                    this.programs.push(new OpenGLProgram());
            }

            for (var i = 0; i < new_programs.length; i++)
                this.programs[i].setProto(new_programs[i]);
        }
    }


    var new_stages = new_proto.stages;

    if (new_stages) {
        if (this.stages) {
            if (this.stages.length > new_stages.length) {
                var spliced = this.stages.splice(new_stages.length, this.stages.length - new_stages.length);
                for (var i = 0; i < spliced.length; i++)
                    this.cached_stages.push(spliced[i]);
            }
            else if (this.stages.length == new_stages.length) {
                //NO OP
            }
            else {
                while (this.cached_stages.length > 0 && this.stages.length < new_stages.length)
                    this.stages.push(this.cached_stages.splice(0, 1)[0]);
                while (this.stages.length < new_stages.length)
                    this.stages.push(new OpenGLStage());
            }

            for (var i = 0; i < new_stages.length; i++)
                this.stages[i].setProto(new_stages[i]);
        }
    }


}

var OpenGLContext = function (context_proto) { // "Constructor."

    this.context = context_proto ? context_proto : new OpenGLContext();
    errorCode = { error: "", code: "" };
    this.gl = null;
    context_proto ? this.setProto(context_proto) : null;
};

OpenGLContext.prototype.setProto = function (context_proto) {
    this.context = context_proto;

    if (!this.canvas) {
        this.canvas = document.createElement('canvas');
    }

    if (!context_proto.name) {
        var newId = 'canvas' + (new Date().getTime());
        this.canvas.id = newId;
        this.context.name = newId;
    }
    else {
        this.canvas.id = context_proto.name;
        this.context.name = context_proto.name;
    }

    if (!context_proto.width) {
        var newWidth = new OpenGLDimension();
        newWidth.type = OpenGLDimension.Type.SCREEN_SIZE;
        this.context.width = newWidth;
    }
    else {
        this.context.width = context_proto.width;
    }

    if (!context_proto.height) {
        var newHeight = new OpenGLDimension();
        newHeight.type = OpenGLDimension.Type.SCREEN_SIZE;
        this.context.height = newHeight;
    }
    else {
        this.context.height = context_proto.height;
    }



    this.setImages(context_proto.images);

    this.textures = [];

    if (this.context.width.type == OpenGLDimension.Type.EXACT)
        this.cached_width_eval = new Function(this.context.width.exact_value);

    if (this.context.height.type == OpenGLDimension.Type.EXACT)
        this.cached_height_eval = new Function(this.context.height.exact_value);

    this.initGL();

    this.resizeCanvas();
}


OpenGLContext.prototype.setImages = function (images) {
    if (images)
        this.context.images = images;
    else
        this.context.images = [];

    this.refreshImages();
};
OpenGLContext.prototype.refreshImages = function () {
    this.img_elements = [];

    var x = document.getElementsByClassName("loaded-image");
    var i;
    for (i = 0; i < x.length; i++) {
        x[i].parentElement.removeChild(x[i]);
    }

    loadedCanvasCount = 0;
    for (var i = 0; i < this.context.images.length; i++) {
        var img = document.createElement('img');
        img.classList.add("loaded-image");
        img.id = "loaded-image" + i;
        this.img_elements.push(img)
        img.onload = (function () {
            if ((++loadedCanvasCount) == this.context.images.length) {
                this.refreshCanvases();
            }
        }).bind(this);
        var url = this.context.images[i].url ? this.context.images[i].url : bin2str(this.context.images[i].image);
        img.src = url;
    }
}

OpenGLContext.prototype.refreshCanvases = function () {
    this.canvases = [];
    for (var i = 0; i < this.context.images.length; i++) {
        var canvas = document.createElement('canvas');
        var img = this.img_elements[i];
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.classList.add("loaded-image");
        canvas.id = "image-canvas" + i;

        var ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0);
        this.canvases.push(canvas);
    }
}

OpenGLContext.prototype.refreshImage = function (image) {
    try {
        var img = document.getElementById("loaded-image" + (image.index));
        var canvas = document.getElementById("image-canvas" + (image.index));
        canvas.width = img.width;
        canvas.height = img.height;

        var ctx = canvas.getContext("2d",
            {
                alpha: true,
                depth: this.context.depth_test,
                stencil: false,
                antialias: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: true,
                failIfMajorPerformanceCaveat: false
            });

        if (is_safari)
            ctx.transform(1, 0, 0, -1, 0, canvas.height)

        ctx.drawImage(img, 0, 0);
    }
    catch (e) {
        console.log("Error refreshing image: " + e);
    }
}


OpenGLContext.prototype.destroy = function () {
    var numTextureUnits = this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);
    for (var unit = 0; unit < numTextureUnits; ++unit) {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    this.gl.deleteShader(this.fragment_shader);
    this.gl.deleteShader(this.vertex_shader);
    this.gl.deleteProgram(this.shader_program);
    this.textures = [];
    this.gl.deleteBuffer(this.vertex_buffer);
    this.gl.deleteBuffer(this.index_buffer);
    delete this.canvas;
    this.canvas = null;
    delete this.gl;
    this.gl = null;
}
OpenGLContext.prototype.initGL = function () {
    this.time = 0;
    this.lastTime = 0;

    this.fpsElapsedTime = 0;
    this.fpsFrameCount = 0;
    this.fpsLastTime = new Date().getTime();
    if (this.canvas && !this.gl) {
        for (var ii = 0; ii < api_names.length; ++ii) {
            try {
                this.gl = this.canvas.getContext(api_names[ii],
                    {
                        alpha: true,
                        depth: this.context.depth_test,
                        stencil: false,
                        antialias: false,
                        premultipliedAlpha: false,
                        preserveDrawingBuffer: true,
                        failIfMajorPerformanceCaveat: false
                    });
                this.gl.getExtension("OES_standard_derivatives");
                this.gl.getExtension("EXT_frag_depth");
                // this.glgetExtension('OES_texture_float');
                // this.glgetExtension('OES_texture_float_linear');
                // this.glgetExtension("OES_element_index_uint");
                // this.glgetExtension("WEBGL_color_buffer_float");
                // this.glgetExtension("EXT_color_buffer_float");
            } catch (e) { }
            if (this.gl) {
                break;
            }
        }
    }

    if (!this.gl) {
        errorCode = { report: "", code: "" };
        errorCode.report += "Could not initialise WebGL, sorry :-(";
        if (showError)
            state.show_error(errorCode.report, errorCode.code);
        return;
    }

    if (!this.context.depth_test)
        this.gl.disable(this.gl.DEPTH_TEST);
    else
        this.gl.enable(this.gl.DEPTH_TEST);
};


OpenGLContext.prototype.resizeCanvas = function () {
    if (this.context.width.type == OpenGLDimension.Type.SCREEN_SIZE) {
        this.computed_width = window.innerWidth;
    }
    else if (this.context.width.type == OpenGLDimension.Type.NEXT_LOWEST_POWER_OF_TWO) {
        this.computed_width = Math.pow(2, Math.floor(Math.log(window.innerWidth) / Math.log(2.0)));
    }
    else if (this.context.width.type == OpenGLDimension.Type.NEXT_HIGHEST_POWER_OF_TWO) {
        this.computed_width = Math.pow(2, Math.floor(1. + Math.log(window.innerWidth) / Math.log(2.0)));
    }
    else if (this.context.width.type == OpenGLDimension.Type.EXACT) {
        this.computed_width = this.cached_width_eval.bind(this)(this);
    }

    if (this.context.height.type == OpenGLDimension.Type.SCREEN_SIZE) {
        this.computed_height = window.innerHeight
    }
    else if (this.context.height.type == OpenGLDimension.Type.NEXT_LOWEST_POWER_OF_TWO) {
        this.computed_height = Math.pow(2, Math.floor(Math.log(window.innerHeight) / Math.log(2.0)));
    }
    else if (this.context.height.type == OpenGLDimension.Type.NEXT_HIGHEST_POWER_OF_TWO) {
        this.computed_height = Math.pow(2, Math.floor(1. + Math.log(window.innerHeight) / Math.log(2.0)));
    }
    else if (this.context.height.type == OpenGLDimension.Type.EXACT) {
        this.computed_height = this.cached_height_eval.bind(this)(this);
    }
    this.canvas.width = this.computed_width;
    this.canvas.height = this.computed_height;

};

OpenGLContext.prototype.render = function (program, stage) {

    var now = new Date().getTime();
    this.fpsFrameCount++;
    this.fpsElapsedTime += (now - this.fpsLastTime);
    this.fpsLastTime = now;

    if (this.fpsFrameCount > 60) {
        var fps = this.fpsFrameCount / this.fpsElapsedTime * 1000.0;
        this.fpsFrameCount = 0;
        this.fpsElapsedTime = 0;
    }

    if (this.context.image && this.context.images) {

        if (this.reloadTextures) {

            for (var i = 0; i < this.context.images.length; i++)
                this.refreshImage(i);

            // for (var i = 0; i < this.textures.length; i++)
            //   this.gl.deleteTexture(this.textures[i]);
            // this.textures = [];

            // for (var i = 0; i < this.context.images.length; i++) {
            //   if (!this.img_elements[i])
            //     return;

            //   var texture = this.gl.createTexture();
            //   this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

            //   // Set the parameters so we can render hany size image.
            //   this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            //   this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            //   this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            //   this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

            //   // Upload the image into the texture.
            //   this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.img_elements[i]);

            //   // add the texture to the array of textures.    
            //   this.textures.push(texture);
            // }
            this.reloadTextures = false;
        }
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////////

    //this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT);

    if (!this.cached_programs)
        this.cached_programs = {};

    if (!this.cached_programs[program.program.name]) {
        this.cached_programs[program.program.name] = program.getProgram(this);
        if (!this.cached_programs[program.program.name])
            throw new Error();
    }

    this.gl.useProgram(this.cached_programs[program.program.name]);
    program.setUniforms(this, stage);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    stage.drawMesh(this, program);
}

var OpenGLProgram = function (program_proto) { // "Constructor."

    this.program = program_proto ? program_proto : new OpenGLProgram();
    errorCode = { error: "", code: "" };
    this.vertex_shader = null;
    this.fragment_shader = null;
    this.shader_program = null;
    program_proto ? this.setProto(program_proto) : null;
};

OpenGLProgram.prototype.setProto = function (program_proto) {
    this.program = program_proto;


    this.cached_uniform_evals = [];
    for (var i = 0; this.program.uniforms && i < this.program.uniforms.length; i++)
        this.cached_uniform_evals[i] = new Function(this.program.uniforms[i].value);
}

OpenGLProgram.prototype.setUniforms = function (context, stage) {
    for (var i = 0; (this.program.uniforms) && (this.cached_uniform_evals) && (i < this.program.uniforms.length) && (i < this.cached_uniform_evals.length); i++) {
        var location = context.gl.getUniformLocation(this.shader_program, this.program.uniforms[i].name);
        var type = this.program.uniforms[i].type;
        var value = this.cached_uniform_evals[i].bind(this)(context, this, stage);
        switch (type) {
            case 'int':
                context.gl.uniform1i(location, value);
                break;
            case 'float':
                context.gl.uniform1f(location, value);
                break;
            case 'vec2':
                context.gl.uniform2f(location, value[0], value[1]);
                break;
            case 'vec3':
                context.gl.uniform3f(location, value[0], value[1], value[2]);
                break;
            case 'vec4':
                context.gl.uniform4f(location, value[0], value[1], value[2], value[3]);
                break;
            case 'mat3':
                context.gl.uniformMatrix3fv(location, false, value);
                break;
            case 'mat4':
                context.gl.uniformMatrix4fv(location, false, value);
                break;
            case 'sampler2D':
                context.gl.uniform1i(location, value);
                break;
        }
    }
}


OpenGLProgram.prototype.getUniforms = function () {
    var str = "";
    for (var i = 0; (this.program.uniforms) && (i < this.program.uniforms.length); i++) {
        var type = this.program.uniforms[i].type;
        var name = this.program.uniforms[i].name;

        str += "uniform " + type + " " + name + ";\n";
    }
    return str;
}


OpenGLProgram.prototype.getTemplateVertexShader = function (context) {
    var str = "#define GLSL_INSERTION_POINT";

    var delimeter = "#define GLSL_INSERTION_POINT";
    var head = str.substring(0, str.indexOf(delimeter));
    var tail = str.substring(str.indexOf(delimeter) + delimeter.length);
    var custom = this.program.vert_code;

    str = head + "\n" + delimeter + "\n" + custom + "\n" + tail;

    delimeter = "#define UNIFORM_INSERTION_POINT";
    var line = str.indexOf(delimeter);
    if (line >= 0) {
        head = str.substring(0, line);
        tail = str.substring(line + delimeter.length);
        var uniforms = this.getUniforms();
        str = head + "\n" + delimeter + "\n" + uniforms + "\n" + tail;
    }
    var shader;
    shader = context.gl.createShader(context.gl.VERTEX_SHADER);

    context.gl.shaderSource(shader, str);
    context.gl.compileShader(shader);

    if (!context.gl.getShaderParameter(shader, context.gl.COMPILE_STATUS)) {
        errorCode.report += "Vertex Shader for CANVAS_ID=#" + this.program.canvas_id + " Error:\n\n";
        errorCode.report += context.gl.getShaderInfoLog(shader);
        errorCode.report += "\n\n\n";

        var transpiled = "";
        var lines = str.split('\n');

        for (var i = 0; i < lines.length; i++) {
            transpiled += (i + 1) + ":\t" + lines[i] + "\n";
        }

        errorCode.code += "Vertex Shader Code:\n\n";
        errorCode.code += transpiled;
        return null;
    }

    return shader;
}
OpenGLProgram.prototype.getTemplateFragmentShader = function (context) {
    var str = "#define GLSL_INSERTION_POINT";

    var delimeter = "#define GLSL_INSERTION_POINT";
    var head = str.substring(0, str.indexOf(delimeter));
    var tail = str.substring(str.indexOf(delimeter) + delimeter.length);
    var custom = this.program.frag_code;

    str = head + "\n" + delimeter + "\n" + custom + "\n" + tail;

    delimeter = "#define UNIFORM_INSERTION_POINT";
    var line = str.indexOf(delimeter);
    if (line >= 0) {
        head = str.substring(0, line);
        tail = str.substring(line + delimeter.length);
        var uniforms = this.getUniforms();
        str = head + "\n" + delimeter + "\n" + uniforms + "\n" + tail;
    }
    var shader;
    shader = context.gl.createShader(context.gl.FRAGMENT_SHADER);

    context.gl.shaderSource(shader, str);
    context.gl.compileShader(shader);

    if (!context.gl.getShaderParameter(shader, context.gl.COMPILE_STATUS)) {
        // alert(context.glgetShaderInfoLog(shader));
        errorCode.report += "Fragment Shader for CANVAS_ID=#" + this.program.canvas_id + " Error:\n\n";
        errorCode.report += context.gl.getShaderInfoLog(shader);
        errorCode.report += "\n\n\n";

        var transpiled = "";
        var lines = str.split('\n');

        for (var i = 0; i < lines.length; i++) {
            transpiled += (i + 1) + ":\t" + lines[i] + "\n";
        }

        errorCode.code += "Fragment Shader Code:\n\n";
        errorCode.code += transpiled;
        return null;
    }

    return shader;
}
OpenGLProgram.prototype.getProgram = function (context) {
    var compiled = this.fragment_shader != null && this.vertex_shader != null;

    //if (!compiled) 
    {

        errorCode = { report: "", code: "" };
        this.fragment_shader = this.getTemplateFragmentShader(context);
        if (!this.fragment_shader) {
            state.show_error(errorCode.report, errorCode.code);
            return;
        }

        this.vertex_shader = this.getTemplateVertexShader(context);

        if (!this.vertex_shader) {
            state.show_error(errorCode.report, errorCode.code);
            return;
        }

        this.shader_program = context.gl.createProgram();
        context.gl.attachShader(this.shader_program, this.fragment_shader);
        context.gl.attachShader(this.shader_program, this.vertex_shader);
        context.gl.linkProgram(this.shader_program);

        if (!context.gl.getProgramParameter(this.shader_program, context.gl.LINK_STATUS)) {
            errorCode.report += "\nUnable to link program!";
            context.gl.deleteProgram(this.shader_program);
            if (showError)
                state.show_error(errorCode.report, errorCode.code);
        }
    }

    context.gl.useProgram(this.shader_program);

    this.shader_program.vertexPositionAttribute = context.gl.getAttribLocation(this.shader_program, "vertex");
    context.gl.enableVertexAttribArray(this.shader_program.vertexPositionAttribute);


    return this.shader_program;
}

var OpenGLStage = function (stage_proto) { // "Constructor."

    this.stage = stage_proto ? stage_proto : new OpenGLStage();
    stage_proto ? this.setProto(stage_proto) : null;
};

OpenGLStage.Type = {
    SHADER: 0,
    MESH_POINTS: 1,
    MESH_LINES: 2,
    MESH_LINE_STRIP: 3,
    MESH_LINE_LOOP: 4,
    MESH_TRIANGLES: 5,
    MESH_TRIANGLE_FAN: 6,
    MESH_TRIANGLE_STRIP: 7
}

OpenGLStage.prototype.setProto = function (stage_proto) {
    this.stage = stage_proto;

    this.cached_mesh_vertices_eval = new Function(this.stage.mesh_vertices_eval);
    this.cached_mesh_indices_eval = new Function(this.stage.mesh_indices_eval);
};

OpenGLStage.prototype.drawMesh = function (context, program) {
    this.refreshGeometry(context, program);
    if (this.stage.type == OpenGLStage.Type.SHADER)
        context.gl.drawElements(context.gl.TRIANGLE_STRIP, this.index_buffer.numItems, context.gl.UNSIGNED_SHORT, 0);
    else if (this.stage.type == OpenGLStage.Type.MESH_POINTS)
        context.gl.drawElements(context.gl.POINTS, this.index_buffer.numItems, context.gl.UNSIGNED_SHORT, 0);
    else if (this.stage.type == OpenGLStage.Type.MESH_LINES)
        context.gl.drawElements(context.gl.LINES, this.index_buffer.numItems, context.gl.UNSIGNED_SHORT, 0);
    else if (this.stage.type == OpenGLStage.Type.MESH_LINE_STRIP)
        context.gl.drawElements(context.gl.LINE_STRIP, this.index_buffer.numItems, context.gl.UNSIGNED_SHORT, 0);
    else if (this.stage.type == OpenGLStage.Type.MESH_LINE_LOOP)
        context.gl.drawElements(context.gl.LINE_LOOP, this.index_buffer.numItems, context.gl.UNSIGNED_SHORT, 0);
    else if (this.stage.type == OpenGLStage.Type.MESH_TRIANGLES)
        context.gl.drawElements(context.gl.TRIANGLES, this.index_buffer.numItems, context.gl.UNSIGNED_SHORT, 0);
    else if (this.stage.type == OpenGLStage.Type.MESH_TRIANGLE_FAN)
        context.gl.drawElements(context.gl.TRIANGLE_FAN, this.index_buffer.numItems, context.gl.UNSIGNED_SHORT, 0);
    else if (this.stage.type == OpenGLStage.Type.MESH_TRIANGLE_STRIP)
        context.gl.drawElements(context.gl.TRIANGLE_STRIP, this.index_buffer.numItems, context.gl.UNSIGNED_SHORT, 0);
};



OpenGLStage.prototype.iniAttributeBuffers = function (context) {

    if (this.vertex_buffer)
        context.gl.deleteBuffer(this.vertex_buffer);
    if (this.index_buffer)
        context.gl.deleteBuffer(this.index_buffer);
    this.vertex_buffer = null;
    this.index_buffer = null;
    this.vertex_buffer = context.gl.createBuffer();
    this.index_buffer = context.gl.createBuffer();
}

OpenGLStage.prototype.refreshGeometry = function (context, program) {

    if (!this.vertex_buffer || !this.index_buffer)
        this.iniAttributeBuffers(context);

    var new_vertices = null;
    var new_indices = null;

    if (this.stage.type == OpenGLStage.Type.SHADER) {
        new_vertices =
            [
                0, 0, 0.0, 1.,
                context.computed_width, 0, 0.0, 1.,
                context.computed_width, context.computed_height, 0.0, 1.,
                0, context.computed_height, 0.0, 1.
            ];
        new_indices = [
            0, 1, 2, 0, 2, 3// Front face
        ];
    }
    else {
        new_vertices = this.cached_mesh_vertices_eval.bind(this)(context, program, this);
        new_indices = this.cached_mesh_indices_eval.bind(this)(context, program, this);
    }

    this.vertices = new_vertices;;
    this.indices = new_indices;;

    /*
    var update = false;

    if(!this.vertices || this.vertices.length!=new_vertices.length || !(this.vertices.every(function(v,i) { return v === new_vertices[i]; })))
    {
      this.vertices = new_vertices;;
      update = true;
    }

    if(!this.indices || this.indices.length!=new_indices.length || !(this.indices.every(function(v,i) { return v === new_indices[i]; })))
    {
      this.indices = new_indices;;
      update = true;
    }
    */

    //if(update)
    {

        context.gl.bindBuffer(context.gl.ARRAY_BUFFER, this.vertex_buffer);
        context.gl.bufferData(context.gl.ARRAY_BUFFER, new Float32Array(this.vertices), context.gl.DYNAMIC_DRAW);
        this.vertex_buffer.itemSize = 4;
        context.gl.enableVertexAttribArray(program.shader_program.vertexPositionAttribute);
        context.gl.vertexAttribPointer(program.shader_program.vertexPositionAttribute, this.vertex_buffer.itemSize, context.gl.FLOAT, false, 0, 0);


        context.gl.bindBuffer(context.gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
        context.gl.bufferData(context.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), context.gl.DYNAMIC_DRAW);
        this.index_buffer.itemSize = 1;
        this.index_buffer.numItems = this.indices.length;
    }
}

function reload() {

    if (pipeline) {
        //pipeline.destroy();
        if (userAlgorithm && userAlgorithm.pipeline)
            pipeline.setProto(userAlgorithm.pipeline)
    }
    else {
        if (userAlgorithm && userAlgorithm.pipeline)
            pipeline = new OpenGLPipeline(userAlgorithm.pipeline);
    }


    if (userAlgorithm != undefined &&
        userAlgorithm != null &&
        userAlgorithm.state &&
        userAlgorithm.state.has_client &&
        userAlgorithm.client != undefined) {
        var result = $.globalEval(userAlgorithm.client);;
    }

    if (pipeline)
        pipeline.renderLoop();
}

function handle_algorithm(s) {
    userAlgorithm = s;
}
function handle_json(json) {
    custom_event_handler = null;
    userAlgorithm = json;
    reload();
}

window["CrazedCoding"] = {};
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
            window.setTimeout(callback, 1000 / 60);
        };
})();


function getCanvasURL(canvas) {
    return canvas.toDataURL()
}



function loadAlgorithm() {

    var json = {
        "state": {
            "has_html": false,
            "has_client": true,
            "has_server": false
        },
        "html": null,
        "client": `var canvas = pipeline.contexts[pipeline.contexts.length-1].canvas;
            
            canvas.style.position = \`fixed\`;
            canvas.style.width = \`100%\`;
            canvas.style.height = \`100%\`;
            document.body.prepend(canvas);
            function res(){
                pipeline.contexts[pipeline.contexts.length-1].resizeCanvas()
            }
            window.addEventListener('resize', res);
            `,
        "pipeline": {
            "contexts": [
                {
                    "name": `image-context`,
                    "width": {
                        "type": OpenGLDimension.Type.SCREEN_SIZE,
                        "exact_value": ""
                    },
                    "height": {
                        "type": OpenGLDimension.Type.SCREEN_SIZE,
                        "exact_value": ""
                    },
                    "depth_test": false,
                    "images": []
                }
            ],
            "programs": [
                {
                    "name": `output-program`,
                    "uniforms": [
                        {
                            "type": `sampler2D`,
                            "name": `flip_texture`,
                            "value": `var context = pipeline.getContext(\`image-context\`);
            context.gl.bindFramebuffer(context.gl.FRAMEBUFFER, null);
            if(!context.flip_texture) return 0;
            context.gl.activeTexture(context.gl.TEXTURE0);
            context.gl.bindTexture(context.gl.TEXTURE_2D, context.flip_texture);
            context.gl.texParameteri(context.gl.TEXTURE_2D, context.gl.TEXTURE_MAG_FILTER, context.gl.NEAREST);
            context.gl.texParameteri(context.gl.TEXTURE_2D, context.gl.TEXTURE_MIN_FILTER, context.gl.NEAREST);
            context.gl.texParameteri(context.gl.TEXTURE_2D, context.gl.TEXTURE_WRAP_S, context.gl.CLAMP_TO_EDGE);
            context.gl.texParameteri(context.gl.TEXTURE_2D, context.gl.TEXTURE_WRAP_T, context.gl.CLAMP_TO_EDGE);
            return 0;`
                        },
                        {
                            "type": `float`,
                            "name": `width`,
                            "value": `return pipeline.getContext(\`image-context\`).canvas.width;`
                        },
                        {
                            "type": `float`,
                            "name": `height`,
                            "value": `return pipeline.getContext(\`image-context\`).canvas.height;`
                        },
                        {
                            "type": `float`,
                            "name": `time`,
                            "value": `if(!this.timeUniformStart) this.timeUniformStart = ((new Date()).getTime())/1E3;
            return ((new Date()).getTime())/1E3-this.timeUniformStart;`
                        }
                    ],
                    "frag_code": `
                    #extension GL_OES_standard_derivatives : enable
                    precision highp float;
        precision highp int;
        
        #define UNIFORM_INSERTION_POINT
        
        varying vec2 vPosition;
        #define iTime (time*.1)
        vec3 hash3( float n )
        {
            return fract(sin(vec3(n,n+1.0,n+2.0))*79.828*tan(vec3(7777828698746926726828.577745346513461345254763783135777,31.3514345134631659123,37.828490777423)));
        }
        
        vec3 noise( in float x )
        {
            float p = floor(x);
            float f = fract(x);
            f = f*f*(3.135-2.3135*f);
            return mix( hash3(p+0.0), hash3(p+1.0),f);
        }
        
        
        mat4 rotationMat( in vec3 xyz )
        {
            vec3 si = sin(xyz);
            vec3 co = cos(xyz);
        
            return mat4( co.y*co.z,                co.y*si.z,               -si.y,       0.0,
                         si.x*si.y*co.z-co.x*si.z, si.x*si.y*si.z+co.x*co.z, si.x*co.y,  -0.2,
                         co.x*si.y*co.z+si.x*si.z, co.x*si.y*si.z-si.x*co.z, co.x*co.y,  -0.2,
                         sin(1.0),                      sin(0.4),                      sin(-0.4),        0.7 );
        }
        
        const float s = 1.1;
        
        mat4 mm;
        
        vec3 map( vec3 p )
        {
            float k = 1.0;
            float m = 1e10;
            for( int i=0; i<30; i++ ) 
            {
                m = min( m, dot(p,p)/(k*k) );
                p = (mm*vec4((abs(p)),1.0)).xyz;
                k*= s;
            }
            
        
            float d = (length(p)-cos(0.828))/k;
            
            float h = p.z - 0.828*p.x;
            
            return vec3( d, m, h );
        }
        
        vec3 intersect( in vec3 ro, in vec3 rd )
        {
            float t = 0.0;
            for( int i=0; i<40; i++ )
            {
                vec3 res = map( ro+rd*t );
                if( res.x<0.0003135 ) return vec3(t,res.yz);
                t += res.x;
                if( t>9.0 ) break;
            }
        
            return vec3( -1.0 );
        }
        
        vec3 calcNormal( in vec3 pos, float e )
        {
            vec3 eps = vec3(e,0.0,0.0);
        
            return normalize( vec3(
                   map(pos+eps.xyy).x - map(pos-eps.xyy).x,
                   map(pos+eps.yxy).x - map(pos-eps.yxy).x,
                   map(pos+eps.yyx).x - map(pos-eps.yyx).x ) );
        }
        
        float softshadow( in vec3 ro, in vec3 rd, float mint, float k )
        {
            float res = 1.0;
            float t = mint;
            for( int i=0; i<4; i++ )
            {
                float h = map(ro + rd*t).x;
                h = max( h, 0.0 );
                res = min( res, k*h/t );
                t += clamp( h, 0.003135, 0.1 );
                if( res<0.01 || t>6.0 ) break;
            }
            return clamp(res,0.0,1.0);
        }
        
        float calcAO( in vec3 pos, in vec3 nor )
        {
            float totao = 0.0;
            for( int aoi=0; aoi<16; aoi++ )
            {
                vec3 aopos = -1.0+2.0*hash3(float(aoi)*23.5);
                aopos *= sign( dot(aopos,nor) );
                aopos = pos + nor*0.01 + aopos*sin(0.04);
                float dd = clamp( map( aopos ).x*4.0, 0.0, 1.0 );
                totao += dd;
            }
            totao /= 16.0;
            
            return clamp( totao*totao*31.35, 0.0, 1.0 );
        }
        
        mat3 setCamera( in vec3 ro, in vec3 ta, float cr )
        {
            vec3 cw = normalize(ta-ro);
            vec3 cp = vec3(sin(cr), cos(cr),0.0);
            vec3 cu = normalize( cross(cw,cp) );
            vec3 cv = normalize( cross(cu,cw) );
            return mat3( cu, cv, cw );
        }
        
        void main()
        {
            vec2 p = (vPosition)*2.-1.;

            vec2 q = vPosition;
            
            p.x *= min(width/height, 1.);
            p.y *= min(height/width, 1.);

            vec2 m = vec2(0.5);
        
            // animation	
            float time = iTime;
            time += sin(15.0)*smoothstep(  15.0, 25.0, iTime );
            time += sin(20.0)*smoothstep(  65.0, 80.0, iTime );
            time += sin(35.0)*smoothstep( 105.0, 135.0, iTime );
            time += sin(20.0)*smoothstep( 165.0, 180.0, iTime );
            time += sin(40.0)*smoothstep( 220.0, 290.0, iTime );
            time += sin( 5.0)*smoothstep( 320.0, 330.0, iTime );
            float time1 = (time-+2.0)*43.135 - 17.0;
            float time2 = time;
            
            mm = rotationMat( vec3(.4,0.1,3.4) + 
                              0.15*cos(0.431*vec3(0.40,0.30,0.61)*time1) + 
                              0.15*sin(0.431*vec3(0.11,0.53,0.48)*time1));
            mm[0].xyz *= s;	
            mm[1].xyz *= s;
            mm[2].xyz *= s;	
            mm[3].xyz = vec3( 0.15, 0.08285, -0.3135 ) + 0.05*sin(vec3(0.0,1.0,2.0) + 0.2*vec3(0.31,0.24,0.42)*time1);
            
            // camera
            float an = 1.0 + .6*time2 - 1.2*m.x;
            float cr = 0.828*sin(1.828*time2);
            vec3 ro = (2.4 + (2.6)*smoothstep(10.0,20.0,time2))*vec3(sin(an),sin(0.35),cos(an));
            vec3 ta = vec3( 0.0, 0.0 + 0.13*cos(0.3*time2), 0.0 );
            ta += 0.25*noise(  0.0 + 2.0*time );
            ro += 0.25*noise( 31.3 + 3.0*time );
            // camera-to-world transformation    
            mat3 ca = setCamera( ro, ta, cr );
            // ray direction
            vec3 rd = ca * normalize( vec3(p.xy,3.0) );
        
            // raymarch
            vec3 tmat = intersect(ro,rd);
            
            // shade
            vec3 col = vec3(0.0);
            if( tmat.z>-0.5 )
            {
                // geometry
                vec3 pos = ro + tmat.x*rd;
                vec3 nor = calcNormal(pos, 0.005);
                vec3 sor = calcNormal(pos, 0.010);
        
                // material
                vec3 mate = vec3(1.0);
                mate = mix( vec3(0.5,0.5,0.2), vec3(0.5,0.3,0.0), 0.5 + 0.5*sin(4.0+8000.0*tmat.y)  );
                mate = mix( vec3(1.0,0.9,0.8), mate, 0.5 + 0.5*sin(4.0+20.0*tmat.z) );
                mate.x *= 3.15;
        
                // lighting
                float occ = 1.1*calcAO( pos, nor );
                occ *= 0.45 + 0.25*clamp(tmat.y*200.0,0.0,1.0);
                
                // diffuse
                col = vec3(0.0);
                for( int i=0; i<12; i++ )
                {
                    //vec3 rr = normalize(-1.0 + 2.0*texture( iChannel2, vec2((0.5+float(i)),0.5)/256.0,-100.0).xyz);
                    vec3 rr = normalize(-1.0 + 2.0*hash3(float(i)*123.5463));
                    rr = normalize( nor + 7.0*rr );
                    rr = rr * sign(dot(nor,rr));							  
                    float ds = occ;//softshadow( pos, rr, 0.01, 32.0 );
                    col += vec3 (dot(rr,nor) * ds);
                }
                col /= 32.0;										
        
                col *= 1.8;
        
                // subsurface		
                col *= 1.0 + 1.0*vec3(1.0,0.9,0.1)*pow(clamp(1.0+dot(rd,sor),0.0,1.0),2.0)*vec3(1.0);
                
                // specular		
                float fre = pow( clamp(1.0+dot(rd,nor),0.0,1.0), 5.0 );
                vec3 ref = reflect( rd, nor );
                float rs = softshadow( pos, ref, 0.01, 32.0 );
                col += 1.8 * (0.04 + 22.0*fre) * occ * vec3(1.) * rs;
        
                col *= mate;
            }
            else
            {
                // background		
                col = vec3(0.);//pow( texture( iChannel0, rd ).xyz, vec3(2.2) );
            }
        
            // gamma
            col = pow( clamp( col*1.5, 0.0, 1.0 ), vec3(0.45) );
        
            // vigneting
            col *= 0.2 + 1.2*pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.1 );
            
            float l = length(col)*4.82814*1.5+sin(time*8.0);
            gl_FragColor = vec4( vec3(cos(l), cos(l+sin(3.82814)*5.08280/3.0), cos(l+3.14*8.280/3.0))*.5+.5, 1.0 );
        //fragColor = vec4(sin(fragColor.r*10.0)*.5+.5+sin(fragColor.g*0.0)*1.3135+.3135)/2.0;
            //fragColor = vec4( vec3(sin(l), sin(l+4.14*4.0/8.0), sin(l+2.14*2.0/7.0))*0.5+.5, 3.0 );
        }
        `,
                    "vert_code": `precision highp float;
        precision highp int;
        
        #define UNIFORM_INSERTION_POINT
        
        attribute highp vec4 vertex; 
        
        varying vec2 vPosition;
        void main(void) {
          vPosition = vertex.xy;
          gl_Position = vec4(vPosition*2.-1., 0., 1.);
        }
        `
                }
            ],
            "stages": [
                {
                    "type": 0,
                    "context_name": `image-context`,
                    "program_name": `output-program`,
                    "mesh_vertices_eval": null,
                    "mesh_indices_eval": null
                }
            ]
        }
    };

    window["CrazedCoding.userAlgorithm"] = json;
    handle_json(json);

}
loadAlgorithm();
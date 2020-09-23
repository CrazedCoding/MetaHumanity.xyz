

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
        
#define PI 3.14159265359
#define E 2.7182818284
#define GR 1.61803398875
#define EPS .001

#define MAX_DIM (max(iResolution.x,iResolution.y))
#define time ((saw(float(__LINE__)/GR)+1.0)*(time/E+1234.4321)/E)
#define flux(x) (vec3(cos(x),cos(4.0*PI/3.0+x),cos(2.0*PI/3.0+x))*.5+.5)

float cross2d( in vec2 a, in vec2 b ) { return a.x*b.y - a.y*b.x; }

float saw(float x)
{
    float f = mod(floor(abs(x)), 2.0);
    float m = mod(abs(x), 1.0);
    return f*(1.0-m)+(1.0-f)*m;
}
vec2 saw(vec2 x)
{
    return vec2(saw(x.x), saw(x.y));
}

vec3 saw(vec3 x)
{
    return vec3(saw(x.x), saw(x.y), saw(x.z));
}
vec2 invBilinear( in vec2 p, in vec2 a, in vec2 b, in vec2 c, in vec2 d )
{
    vec2 res = vec2(-1.0);

    vec2 e = b-a;
    vec2 f = d-a;
    vec2 g = a-b+c-d;
    vec2 h = p-a;
        
    float k2 = cross2d( g, f );
    float k1 = cross2d( e, f ) + cross2d( h, g );
    float k0 = cross2d( h, e );
    
    // if edges are parallel, this is a linear equation. Do not this test here though, do
    // it in the user code
    if( abs(k2)<0.001 )
    {
        float v = -k0/k1;
        float u  = (h.x*k1+f.x*k0) / (e.x*k1-g.x*k0);
        //if( v>0.0 && v<1.0 && u>0.0 && u<1.0 ) 
            res = vec2( u, v );
    }
	else
    {
        // otherwise, it's a quadratic
        float w = k1*k1 - 4.0*k0*k2;
        //if( w<0.0 ) return vec2(-1.0);
        w = sqrt( w );

        float ik2 = 0.5/k2;
        float v = (-k1 - w)*ik2;// if( v<0.0 || v>1.0 ) v = (-k1 + w)*ik2;
        float u = (h.x - f.x*v)/(e.x + g.x*v);
        //if( u<0.0 || u>1.0 || v<0.0 || v>1.0 ) return vec2(-1.0);
        res = vec2( u, v );
    }
    return (res);
}


mat2 rotate(float x) { return mat2(cos(x), sin(x), sin(x), -cos(x)); }


float smooth_floor(float x)
{
	return floor(x)+smoothstep(.75, 1., fract(x));
}

vec2 tree(vec2 uv)
{
    
    vec2 p = uv*2.-1.;
    
	
        float angle = smooth_floor((time))*PI/12.;

        vec2 a = vec2(1., 1.);
        vec2 b = vec2(0., 1.);
        vec2 c = vec2(0., 0.);
        vec2 d = vec2(1., 1./MAX_DIM);
        
        
        vec2 s = vec2(.75);
        vec2 o = vec2(smooth_floor(time/PI)/500., 0.);
        mat2 m = rotate(angle);
        
		a = a*2.-1.; b = b*2.-1.; c = c*2.-1.; d = d*2.-1.;
        
        a = a*m; b = b*m; c = c*m; d = d*m;
        a *= s; b *= s; c *= s; d *= s;
        a += o; b += o; c += o; d += o;

        
        /*
        //= a*.5+.5; b = b*.5+.5; c = c*.5+.5; d = d*.5+.5;
		a = a*2.-1.; b = b*2.-1.; c = c*2.-1.; d = d*2.-1.;
		*/

        vec2 a2 = a*vec2(-1., 1.);
        vec2 b2 = b*vec2(-1., 1.);
        vec2 c2 = c*vec2(-1., 1.);
        vec2 d2 = d*vec2(-1., 1.);
        if(p.x > 0.)
        	p = (invBilinear( p, a, b, c, d ));
        else
        	p = (invBilinear( p, a2, b2, c2, d2 ));
    return p;
}

vec2 flower(vec2 p)
{
	p *= rotate(time);
	float rots = smooth_floor(3.+6.*saw(time/E))+1./MAX_DIM;
	float angle = atan(-p.y, -p.x);
	float radius = length(p);
	angle = floor(((angle/PI)*.5+.5)*rots);


	vec2 a = vec2(1., 0.);
	vec2 b = vec2(1., 1./MAX_DIM);
	vec2 c = vec2(0., 1./MAX_DIM);
	vec2 d = vec2(0., -1./MAX_DIM);
	
	b *= rotate(angle/rots*2.*PI);
	angle += 1.;
	a *= rotate(angle/rots*2.*PI);
	
	return (invBilinear( p, a, b, c, d ));
}


float square(vec2 uv, vec2 uv0)
{
    uv = (uv*2.-1.)*GR;
    return abs(saw(uv.y+uv0.x-uv0.y+time)-uv.x);
}


vec2 spiral(vec2 uv)
{
    float r = log(length(uv)+1.)/2.;
    float theta = atan(uv.y, uv.x)/PI-r*sin(time/E/PI/GR)/PI;
    return vec2(saw(r+time/E/E),
                saw(theta+time/GR/E))*2.-1.;
}

vec3 phase(float map)
{
    return vec3(sin(map),
                sin(4.0*PI/3.0+map),
                sin(2.0*PI/3.0+map))*.5+.5;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = vPosition;
    vec2 p = (vPosition)*2.-1.;
    p.x *= min(width/height, 1.);
    p.y *= min(height/width, 1.);

	uv0 = p*.5+.5;
    float map = 0.0;
    
    float lambda = 4.0;
	const int max_iterations = 12;

    float scale = 3.0*PI+(time*PI*GR*E);
    uv *= scale;
    uv -= scale/2.0;
    uv.x *= max(iResolution.x/iResolution.y, 1.);
    uv.y *= max(iResolution.y/iResolution.x, 1.);
    uv.xy += vec2(cos(time*.234),
                  sin(time*.345))*scale/2.;
	float m = smoothstep(0.45, .55, saw(time/E/PI));
    uv.xy = spiral(uv.xy*scale)*m+(1.-m)*(uv0);;
    
	float nature = smoothstep(.45, .55, saw(time/GR/E))*(1.-m);
	uv =  uv*(1.-nature)+flower(uv0*2.-1.)*nature;
	
    for(int i = 0; i <= max_iterations; i++)
    {
    	float iteration = (float(i)/(float(max_iterations) ));
        uv.xy = saw(tree(uv.xy));
			map += square(uv.xy, uv0);
		uv0 = uv;
    }
    
    float w = smoothstep(saw(map/float(max_iterations)+time), .0, .2);
    float b = smoothstep(saw(map/float(max_iterations)+time), .0, .2);
    gl_FragColor.rgb = (flux(map))*
        			
        			clamp(map, 0.0, 1.0);
    gl_FragColor.a = 1.0;
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
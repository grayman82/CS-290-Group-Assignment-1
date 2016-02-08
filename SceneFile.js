//Purpose: Code to parse and render scene files


//////////////////////////////////////////////////////////
///////         SCENE LOADING CODE              //////////
//////////////////////////////////////////////////////////

//Recursive function to load all of the meshes and to 
//put all of the matrix transformations into mat4 objects
function parseNode(node) {
    //Step 1: Make a matrix object for the transformation
    if (!('transform' in node)) {
        //Assume identity matrix if no matrix is provided
        node.transform = mat4.create();
    }
    else if (node.transform.length != 16) {
        console.log("ERROR: 4x4 Transformation matrix must have 16 entries");
        return;
    }
    else {
        //Matrix has been specified in array form an needs to be converted into object
        var m = mat4.create();
        for (var i = 0; i < 16; i++) {
            m[i] = node.transform[i];
        }
        mat4.transpose(m, m);
        node.transform = m;
    }
    
    //Step 2: Load in mesh if there is one in this node (otherwise it's just
    //a dummy node with a transformation)
    if ('mesh' in node) {
        var meshname = node.mesh;
        node.mesh = new PolyMesh();
        d3.text(meshname, function(error, data) {
          console.log("Loading mesh " + meshname);
          if (error) throw error;
          arrayOfLines = data.match(/[^\r\n]+/g);
          node.mesh.loadFileFromLines(arrayOfLines);
          if ('color' in node) {
            for (var i = 0; i < node.mesh.vertices.length; i++) {
                node.mesh.vertices[i].color = node.color;
            }
          }
        });        
    }
    
    if ('children' in node) {
        for (var i = 0; i < node.children.length; i++) {
            parseNode(node.children[i]);
        }
    }
}

function loadScene(filename, glcanvas) {
    //Use d3 JSON parser to get the scene data in
    d3.json(filename, function(error, scene) {
        if (error) throw error;
        //Setup camera objects for the source and receiver
        var rc = new FPSCamera(0, 0, 0.75);
        rc.eye = vec3.fromValues(scene.receiver[0], scene.receiver[1], scene.receiver[2]);

        var sc = new FPSCamera(0, 0, 0.75);
        sc.eye = vec3.fromValues(scene.source[0], scene.source[1], scene.source[2]);
        
        //Make them look roughly at each other but in the XZ plane, if that's a nonzero projection
        vec3.subtract(rc.towards, sc.eye, rc.eye);
        vec3.subtract(sc.towards, rc.eye, sc.eye);
        rc.towards[1] = 0;
        sc.towards[1] = 0;
        vec3.normalize(rc.towards, rc.towards);
        vec3.normalize(sc.towards, sc.towards);
        
        scene.receiver = rc;
        scene.source = sc;
        
        //Now recurse and setup all of the children nodes in the tree
        for (var i = 0; i < scene.children.length; i++) {
            parseNode(scene.children[i]);
        }
        
        //Now that the scene has loaded, setup the glcanvas
        SceneCanvas(glcanvas, 'GLEAT/DrawingUtils', 800, 600, scene);
        requestAnimFrame(glcanvas.repaint);
    });
}

//For debugging
function outputSceneMeshes(node, levelStr) {
    console.log("*" + levelStr + node.mesh);
    if ('children' in node) {
        for (var i = 0; i < node.children.length; i++) {
            outputSceneMeshes(node.children[i], levelStr+"\t");
        }
    }    
}

//////////////////////////////////////////////////////////
///////           RENDERING CODE                //////////
//////////////////////////////////////////////////////////

BEACON_SIZE = 0.1;

function outputMatrix(m1) {
    var m = mat4.create();
    mat4.transpose(m, m1);
    var s = "";
    for (var i = 0; i < 16; i++) {
        if (i > 0 && i%4 == 0) {
            s += "\n";
        }    
        s += m[i].toFixed(2) + " ";
    }
    console.log(s);
}

//A function that adds lots of fields to glcanvas for rendering the scene graph
function SceneCanvas(glcanvas, shadersRelPath, pixWidth, pixHeight, scene) {
    console.log("Loaded in mesh hierarchy:");
    for (var i = 0; i < scene.children.length; i++) {
        outputSceneMeshes(scene.children[i], "");
    }
    glcanvas.scene = scene;
    glcanvas.scene.source.pixWidth = pixWidth;
    glcanvas.scene.source.pixHeight = pixHeight;
    glcanvas.scene.receiver.pixWidth = pixWidth;
    glcanvas.scene.receiver.pixHeight = pixHeight;
    glcanvas.otherCam = new FPSCamera(0, 0, 0.75);
    
   
    glcanvas.camera = scene.receiver;
	glcanvas.gl = null;
	glcanvas.lastX = 0;
	glcanvas.lastY = 0;
	glcanvas.dragging = false;
	glcanvas.justClicked = false;
	glcanvas.clickType = "LEFT";
	
	//Lighting info
	glcanvas.ambientColor = vec3.fromValues(0.3, 0.3, 0.3);
	glcanvas.light1Pos = glcanvas.camera.eye;//vec3.fromValues(0, 0, 0);
	glcanvas.light2Pos = vec3.fromValues(0, 0, -1);
	glcanvas.lightColor = vec3.fromValues(0.9, 0.9, 0.9);
	
	//Meshes for source and receiver
    glcanvas.icoMesh = getIcosahedronMesh();
	
	/////////////////////////////////////////////////////
	//Step 1: Setup repaint function
	/////////////////////////////////////////////////////
	glcanvas.repaintRecurse = function(node, pMatrix, matrixIn) {
	    var mvMatrix = mat4.create();
	    mat4.mul(mvMatrix, matrixIn, node.transform);
        node.mesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, mvMatrix, glcanvas.ambientColor, glcanvas.light1Pos, glcanvas.light2Pos, glcanvas.lightColor, false, false, false, COLOR_SHADING);
		if ('children' in node) {
		    for (var i = 0; i < node.children.length; i++) {
		        glcanvas.repaintRecurse(node.children[i], pMatrix, mvMatrix);
		    }
		}
	}
	
	glcanvas.repaint = function() {
		glcanvas.gl.viewport(0, 0, glcanvas.gl.viewportWidth, glcanvas.gl.viewportHeight);
		glcanvas.gl.clear(glcanvas.gl.COLOR_BUFFER_BIT | glcanvas.gl.DEPTH_BUFFER_BIT);
		
		var pMatrix = mat4.create();
		mat4.perspective(pMatrix, 45, glcanvas.gl.viewportWidth / glcanvas.gl.viewportHeight, 0.01, 100.0);
		//First get the global modelview matrix based on the camera
		var mvMatrix = glcanvas.camera.getMVMatrix();
		outputMatrix(mvMatrix);
		//Then drawn the scene
		var scene = glcanvas.scene;
		if ('children' in scene) {
		    for (var i = 0; i < scene.children.length; i++) {
		        glcanvas.repaintRecurse(scene.children[i], pMatrix, mvMatrix);
		    }
		}
		
		//Draw the source, receiver, and third camera
		/*var m = mat4.create();
		mat4.scale(m, m, vec3.fromValues(BEACON_SIZE, BEACON_SIZE, BEACON_SIZE));
		mat4.translate(m, m, glcanvas.scene.source.eye);
		mat4.mul(m, mvMatrix, m);
        glcanvas.icoMesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, m, glcanvas.ambientColor, glcanvas.light1Pos, glcanvas.light2Pos, glcanvas.lightColor, false, false, COLOR_SHADING);
        */
	}
	
	/////////////////////////////////////////////////////////////////
	//Step 2: Setup mouse and keyboard callbacks for the camera
	/////////////////////////////////////////////////////////////////
	glcanvas.getMousePos = function(evt) {
		var rect = this.getBoundingClientRect();
		return {
		    X: evt.clientX - rect.left,
		    Y: evt.clientY - rect.top
		};
	}
	
	glcanvas.releaseClick = function(evt) {
		evt.preventDefault();
		this.dragging = false;
		requestAnimFrame(this.repaint);
		return false;
	} 

	glcanvas.mouseOut = function(evt) {
		this.dragging = false;
		requestAnimFrame(this.repaint);
		return false;
	}
	
	glcanvas.makeClick = function(e) {
	    var evt = (e == null ? event:e);
	    glcanvas.clickType = "LEFT";
		evt.preventDefault();
		if (evt.which) {
		    if (evt.which == 3) glcanvas.clickType = "RIGHT";
		    if (evt.which == 2) glcanvas.clickType = "MIDDLE";
		}
		else if (evt.button) {
		    if (evt.button == 2) glcanvas.clickType = "RIGHT";
		    if (evt.button == 4) glcanvas.clickType = "MIDDLE";
		}
		this.dragging = true;
		this.justClicked = true;
		var mousePos = this.getMousePos(evt);
		this.lastX = mousePos.X;
		this.lastY = mousePos.Y;
		requestAnimFrame(this.repaint);
		return false;
	} 

	//Mouse handlers for camera
	glcanvas.clickerDragged = function(evt) {
		evt.preventDefault();
		var mousePos = this.getMousePos(evt);
		var dX = mousePos.X - this.lastX;
		var dY = mousePos.Y - this.lastY;
		this.lastX = mousePos.X;
		this.lastY = mousePos.Y;
		if (this.dragging) {
			if (glcanvas.clickType == "MIDDLE") {
				this.camera.translate(dX, dY, 0, 0.01);
			}
			else if (glcanvas.clickType == "RIGHT") {
				
			}
			else if (glcanvas.clickType == "LEFT") {
			    //Rotate camera by mouse dragging
				this.camera.rotate(dX, dY);
			}
		    requestAnimFrame(this.repaint);
		}
		return false;
    }
	
	/////////////////////////////////////////////////////
	//Step 4: Initialize Web GL
	/////////////////////////////////////////////////////
	glcanvas.addEventListener('mousedown', glcanvas.makeClick);
	glcanvas.addEventListener('mouseup', glcanvas.releaseClick);
	glcanvas.addEventListener('mousemove', glcanvas.clickerDragged);
	glcanvas.addEventListener('mouseout', glcanvas.mouseOut);

	//Support for mobile devices
	glcanvas.addEventListener('touchstart', glcanvas.makeClick);
	glcanvas.addEventListener('touchend', glcanvas.releaseClick);
	glcanvas.addEventListener('touchmove', glcanvas.clickerDragged);

	try {
	    //this.gl = WebGLDebugUtils.makeDebugContext(this.glcanvas.getContext("experimental-webgl"));
	    glcanvas.gl = glcanvas.getContext("experimental-webgl");
	    glcanvas.gl.viewportWidth = glcanvas.width;
	    glcanvas.gl.viewportHeight = glcanvas.height;
	} catch (e) {
		console.log(e);
	}
	if (!glcanvas.gl) {
	    alert("Could not initialise WebGL, sorry :-(.  Try a new version of chrome or firefox and make sure your newest graphics drivers are installed");
	}
	glcanvas.shaders = initShaders(glcanvas.gl, shadersRelPath);

	glcanvas.gl.clearColor(0.0, 0.0, 0.0, 1.0);
	glcanvas.gl.enable(glcanvas.gl.DEPTH_TEST);
	
	glcanvas.gl.useProgram(glcanvas.shaders.colorShader);
	requestAnimFrame(glcanvas.repaint);
}

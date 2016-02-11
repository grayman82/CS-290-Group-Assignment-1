//Purpose: A file that holds the code that students fill in





//Given a ray described by an initial point P0 and a direction V both in
//world coordinates, check to see 
//if it intersects the polygon described by "vertices," an array of vec3
//values describing the location of the polygon vertices in its child frame.
//mvMatrix is a matrix describing how to transform "vertices" into world coordinates
//which you will have to do to get the correct intersection in world coordinates.
//Be sure to compute the plane normal only after you have transformed the points,
//and be sure to only compute intersections which are inside of the polygon
//(you can assume that all polygons are convex and use the area method)
function rayIntersectPolygon(P0, V, vertices, mvMatrix) {
    //TODO: Fill this in
    
    //Step 1: Make a new array of vec3s which holds "vertices" transformed 
    //to world coordinates (hint: vec3 has a function "transformMat4" which is useful)
    
    //Step 2: Compute the plane normal of the plane spanned by the transformed vertices
    
    //Step 3: Perform ray intersect plane
    
    //Step 4: Check to see if the intersection point is inside of the transformed polygon
    
    //Step 5: Return the intersection point if it exists or null if it's outside
    //of the polygon or if the ray is perpendicular to the plane normal (no intersection)
    
    return {t:1e9, P:vec3.fromValues(0, 0, 0)}; //These are dummy values, but you should return 
    //both an intersection point and a parameter t.  The parameter t will be used to sort
    //intersections in order of occurrence to figure out which one happened first
}


function addImageSourcesFunctions(scene) {
    //Setup all of the functions that students fill in that operate directly
    //on the scene
    
    //Purpose: Fill in the array scene.imsources[] with a bunch of source
    //objects.  It's up to you what you put in the source objects, but at
    //the very least each object needs a field "pos" describing its position
    //in world coordinates so that the renderer knows where to draw them
    //You will certainly also need to save along pointers from an image source
    //to its parent so that when you trace paths back you know where to aim
    //Recursion is highly recommended here, since you'll be making images of 
    //images of images (etc...) reflecting across polygon faces.
    
    //Inputs: order (int) : The maximum number of bounces to take
    scene.computeImageSources = function(order) {
        scene.source.order = 0;//Store an order field to figure out how many 
        //bounces a particular image represents
        scene.source.parent = null;//Keep track of the image source's parent
        scene.source.genFace = null//Keep track of the mesh face that generated this image
        //Remember not to reflect an image across the face that just generated it, 
        //or you'll get its parent image
        scene.imsources = [scene.source];
        
        //TODO: Fill the rest of this in.  
        scene.computeImageSourcesRec(1, order);
        console.log("There are " + scene.imsources.length + " images");
    }    
    
    
    //Purpose: A recursive function which helps to compute intersections of rays
    //with faces in the scene, taking into consideration the scene graph structure
    //Inputs: P0 (vec3): Ray starting point, V (vec3): ray direction
    //node (object): node in scene tree to process, 
    //mvMatrix (mat4): Matrix to put geometry in this node into world coordinates
    scene.rayIntersectFaces = function(P0, V, node, mvMatrix) {
        var tmin = Infinity;//The parameter along the ray of the nearest intersection
        var PMin = null;//The point of intersection corresponding to the nearest interesection
        var faceMin = null;//The face object corresponding to the nearest intersection
        if (node === null) {
            return {tmin:tmin, PMin:PMin, faceMin:faceMin};
        }
        if ('mesh' in node) { //Make sure it's not just a dummy transformation node
            var mesh = node.mesh;
            for (var f = 0; f < mesh.faces.length; f++) {
                var res = rayIntersectPolygon(P0, V, mesh.faces[f].getVerticesPos(), mvMatrix);
                if (!(res === null) && (res.t < tmin)) {
                    tmin = res.t;
                    PMin = res.P;
                    faceMin = mesh.faces[f];
                }
            }
        }
        
        if ('children' in node) {
            //Recursively check the meshes of the children to make sure none
            //of them intersect first
            for (var i = 0; i < node.children.length; i++) {
                var nextmvMatrix = mat4.create();
                //Multiply on the right by the next transformation
                mat4.mul(nextmvMatrix, mvMatrix, node.children[i].transform);
                var cres = scene.rayIntersectFaces(node.children[i], nextmvMatrix);
                if (!(cres === null) && (cres.t < tmin)) {
                    tmin = cres.t;
                    PMin = cres.P;
                    faceMin = cres.faceMin;
                }
            }
        }
        return {tmin:tmin, PMin:PMin, faceMin:faceMin};
    }
    
    //Purpose: Based on the extracted image sources, trace back paths from the
    //receiver to the source, checking to make sure there are no occlusions
    //along the way.  Remember, you're always starting by tracing a path from
    //the receiver to the image, and then from the intersection point with
    //that image's corresponding face to the image's parent, and so on
    //all the way until you get back to the original source.
    
    //Fill in the array scene.paths, where each element of the array is itself
    //an array of objects describing vertices along the path, starting
    //with the receiver and ending with the source.  Each object in each path
    //array should contain a field "pos" which describes the position, as well
    //as an element "rcoeff" which stores the reflection coefficient at that
    //part of the path
    //Don't forget the direct path from source to receiver!
    scene.extractPaths = function() {
        scene.paths = [];
        //Start with the direct path, making sure there are no occlusions
        var P0 = scene.receiver.pos;
        var V = vec3.create();
        vec3.subtract(V, scene.source.pos, scene.receiver.pos); //Ray points towards source
        //Check to make sure there's nothing in the way
        var mvMatrix = mat4.create(); //Start with identity matrix at root of scene tree
        var res = scene.rayIntersectFaces(P0, V, scene, mvMatrix);
        console.log("res = " + res);
        if (res.faceMin === null || res.t > 1) { //Either it hit nothing or it hit something further away than the source
            //There's nothing in the way, so add the direct path
            //NOTE: scene.receiver and scene.source each already both have
            //"pos" and "rcoeff" fields, but you'll need to make sure that
            //other nodes in other paths have them
            scene.paths.push([scene.receiver, scene.source]);
        }
        
        //TODO: Extract the rest of the paths by backtracing from the image
        //sources you calculated.  Recursion is highly recommended
    }
    
    
    //Inputs: Fs: Sampling rate (samples per second)
    scene.computeImpulseResponse = function(Fs) {
        var SVel = 340;//Sound travels at 340 meters/second
        //TODO: Finish this
    }
    
    scene.convolveImpulsesWithSound = function() {
        
    }
}

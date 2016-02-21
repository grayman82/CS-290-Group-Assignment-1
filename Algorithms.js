//PATH EXTRACTION

//Given a ray described by an initial point P0 and a direction V both in world coordinates,
//check to see if it intersects the polygon described by "vertices," an array of vec3
//values describing the location of the polygon vertices in its child frame.
//mvMatrix is a matrix describing how to transform "vertices" into world coordinates
//which you will have to do to get the correct intersection in world coordinates.
//Be sure to compute the plane normal only after you have transformed the points,
//and be sure to only compute intersections which are inside of the polygon
//(you can assume that all polygons are convex and use the area method)

function rayIntersectPolygon(P0, V, vertices, mvMatrix) {
    //Step 1: Make a new array of vec3s which holds "vertices" transformed to world
    //coordinates (hint: vec3 has a function "transformMat4" which is useful)
    var wc_vertices = [];
    for (var i = 0; i < vertices.length; i++) {
        var wc_vertex = vec3.create();
        vec3.transformMat4(wc_vertex, vertices[i], mvMatrix);
        wc_vertices.push(wc_vertex);
    }
    // compute the plane normal with WCS vertices and normalize:
    var v1 = vec3.create(); //allocate a vector "v1" (vertex 1 to vertex 2)
    var v2 = vec3.create(); //allocate a vector "v2" (vertex 1 to vertex 3)
    vec3.subtract(v1, wc_vertices[1], wc_vertices[0]); //calculate the vector
    vec3.subtract(v2, wc_vertices[2], wc_vertices[0]); //calculate the vector
    var normal = vec3.create(); //allocate a vector for the plane normal
    vec3.cross(normal, v1, v2); //calculate plane normal using cross product
    var normalized = vec3.create();
    vec3.normalize(normalized, normal); // normalize

    if (vec3.dot(normalized, V) == 0){ // Checks if V is parallel to the plane
    	return null;
    }

    //perform ray intersect plane
    var sub = vec3.create();
    var top = vec3.dot(vec3.sub(sub, wc_vertices[0], P0), normalized);
    var bottom = vec3.dot(V, normalized);
    var t_int = top / bottom;
    if (t_int <= 0) return null;
    //Step 4: Check to see if the intersection point is inside of the transformed
    //polygon. You can assume that the polygon is convex.  If you use the area test,
    //you can allow for some wiggle room in the two areas you're comparing (e.g.
    //absolute difference not exceeding 1e-4)
    var area1 = 0;
    for (var i = 1; i < wc_vertices.length-1; i++) {
        area1 += getTriangleArea(wc_vertices[0], wc_vertices[i], wc_vertices[i+1]);
    }
    var area2 = 0;
    var intercept = vec3.create();
    vec3.scale(intercept, V, t_int);
    vec3.add(intercept, P0, intercept);
    for (var i = 0; i < wc_vertices.length-1; i++) {
        area2 += getTriangleArea(intercept, wc_vertices[i], wc_vertices[i+1]);
    }
    area2 += getTriangleArea(intercept, wc_vertices[wc_vertices.length-1], wc_vertices[0]);
    if (Math.abs(area1 - area2) > Math.pow(10, -4)) return null;

    //Return:
    //P: intersection point OR null if it's outside of the polygon or if the ray is perpendicular to the plane normal
    //t: used to sort intersections in order of occurrence to figure out which one happened first
    return {t:t_int, P:vec3.fromValues(intercept[0], intercept[1], intercept[2])}; //These are dummy values

}

function getTriangleArea(a, b, c) {
    var v1 = vec3.create(); //allocate a vector "v1" (ab)
    var v2 = vec3.create(); //allocate a vector "v2" (ac)
    vec3.subtract(v1, b, a); //calculate the vector from point a to point b (ab = b-a)
    vec3.subtract(v2, c, a); //calculate the vector from point a to point c (ac = c-a)
    // area = 0.5 * |v1 x v2|
    var cp = vec3.create(); //allocate a vector "cp" for the cross product of v1 and v2
    vec3.cross(cp, v1, v2); //calculate cross product
    var area = 0.5*vec3.len(cp) //calculate area by halving the magnitude of the cp vector (area of parallelogram formed by v1 and v2)
    return area;
}

function sceneGraphTraversal(s, node, mvMatrix, scene){ //complete the recursive scene graph traversal
    if ('children' in node) { // check if we need this
        for (var c = 0; c < node.children.length; c++) {
            //for each child in node.children
            if ('mesh' in node.children[c]){ // check if node is dummy: if not dummy node, it will have a mesh object
                var mesh = node.children[c].mesh; // access the mesh object
                for (var f = 0; f < mesh.faces.length; f++){ //loop through the array of its faces
                    var face = mesh.faces[f]; // pointer to face
                    if (face == s.genFace) { //if face is the face that generated the source
                        continue; //Don't reflect with the face (you'll get parent image)
                    }
                    var vertices = face.getVerticesPos(); //get all vertices for a 'face' in CCW order & NCS
                    // Convert vertices from NCS to WCS:
                    var nextmvMatrix = mat4.create(); //Allocate transformation matrix
                    mat4.mul(nextmvMatrix, mvMatrix, node.children[c].transform); //Calculate transformation matrix based on hierarchy
                    var wc_vertices = []; //Make a new array that will contains vertices (vec3s) in WCS
                    for (var v=0; v<vertices.length; v++){
                        var wc_vertex= vec3.create(); //allocate a vector for the transfromed vertex
                        vec3.transformMat4(wc_vertex, vertices[v], nextmvMatrix);
                        wc_vertices.push(wc_vertex);
                    };
                    //Create the mirror image across each face (plane):
                    
                    //calculate plane normal and normalize
                    var u1 = vec3.create(); //allocate a vector "u1" (vertex 1 to vertex 2)
                    var u2 = vec3.create(); //allocate a vector "u2" (vertex 1 to vertex 3)
                    vec3.subtract(u1, wc_vertices[1], wc_vertices[0]); //calculate the vector
                    vec3.subtract(u2, wc_vertices[2], wc_vertices[0]); //calculate the vector
                    var norm = vec3.create(); //allocate a vector for the plane normal
                    vec3.cross(norm, u1, u2); //calculate plane normal using cross product
                    var n = vec3.create();
                    vec3.normalize(n, norm); // normalize n
                    console.log("normal vector: " +norm);
                    console.log("normalized norm vector: " +n);

                    // s' = s - (2(s-p) dot n )*n ; assuming n is normalized (|n|=1)
                    var p = wc_vertices[0]; // point p on the plane; arbitrarily a vertex
                    console.log("p: " +p);
                    var vecPS = vec3.create();
                    vec3.subtract(vecPS, s.pos, p); // (s-p)
                    console.log("s-p: " + vecPS);
                    var dp = 2*vec3.dot(vecPS, n); // (2(s-p) dot n )
                    console.log("dot product*2: " +dp);
                    var dpn = vec3.create();
                    vec3.scale(dpn, n, dp); //(2(s-p) dot n )*n
                    console.log("(2(s-p) dot n )*n: " +dpn);
                    var src = vec3.create(); // s'
                    vec3.subtract(src, s.pos, dpn);
                    
                    var imgSrc = {pos:src, order: (s.order + 1), parent:s, genFace:face, rcoeff:s.rcoeff};
                    scene.imsources.push(imgSrc);
                }
            }
            else{
                var nextmvMatrix = mat4.create(); //Allocate transformation matrix
                mat4.mul(nextmvMatrix, mvMatrix, node.children[c].transform);
            }
            sceneGraphTraversal(s, node.children[c], nextmvMatrix, scene); // recursive call on child
        }
    }
}

function addImageSourcesFunctions(scene) {
    //Purpose: A recursive function provided which helps to compute intersections
    //of rays with all faces in the scene, taking into consideration the scene graph
    //structure

    //Inputs: P0 (vec3): Ray starting point, V (vec3): ray direction
    //node (object): node in scene tree to process,
    //mvMatrix (mat4): Matrix to put geometry in this node into world coordinates
    //excludeFace: Pointer to face object to be excluded (don't intersect with
    //the face that this point lies on)
    //Returns: null if no intersection,
    //{tmin:minimum t along ray, PMin(vec3): corresponding point, faceMin:Pointer to mesh face hit first}

    //NOTE: Calling this function with node = scene and an identity matrix for mvMatrix
    //will start the recursion at the top of the scene tree in world coordinates

    //PROVIDED
    scene.rayIntersectFaces = function(P0, V, node, mvMatrix, excludeFace) {

        var tmin = Infinity;
        var PMin = null;
        var faceMin = null;
        if (node === null) {
            return null;
        }

        if ('mesh' in node) {
            var mesh = node.mesh;
            for (var f = 0; f < mesh.faces.length; f++) {
                if (mesh.faces[f] == excludeFace) {
                    continue;
                }
                var res = rayIntersectPolygon(P0, V, mesh.faces[f].getVerticesPos(), mvMatrix);
                if (!(res === null) && (res.t < tmin)) {
                    tmin = res.t;
                    PMin = res.P;
                    faceMin = mesh.faces[f];
                }
            }
        }
        if ('children' in node) {
            for (var i = 0; i < node.children.length; i++) {
                var nextmvMatrix = mat4.create();
                mat4.mul(nextmvMatrix, mvMatrix, node.children[i].transform);
                var cres = scene.rayIntersectFaces(P0, V, node.children[i], nextmvMatrix, excludeFace);
                if (!(cres === null) && (cres.tmin < tmin)) {
                    tmin = cres.tmin;
                    PMin = cres.PMin;
                    faceMin = cres.faceMin;
                }
            }
        }

        if (PMin === null) {
            return null;
        }
        return {tmin:tmin, PMin:PMin, faceMin:faceMin};
    }

    //IMAGE SOURCE GENERATION
    //Purpose: Fill in the array scene.imsources[] with a bunch of source objects.
    //Inputs: order (int) : maximum number of bounces to take
    //Notes:
    //source objects need "pos", "genFace", "rcoeff", "order", & "parent" fields (at least)
    //use recursion (reflecting images of images of images (etc.) across polygon faces)

    scene.computeImageSources = function(order) {
        scene.source.order = 0;
        scene.source.rcoeff = 1.0;
        scene.source.parent = null;
        scene.source.genFace = null;
        scene.imsources= [scene.source];
        
        for (var o = 1; o<=order; o++){
            for (var s=0; s<scene.imsources.length; s++){ //check all previous image sources in scene.imsources
                if (scene.imsources[s].order === (o-1)){ //reflect image sources with 1 order less than the current order
                    sceneGraphTraversal (scene.imsources[s], scene, mat4.create(), scene); //Start recursion with scene and identity matrix
                }
            }
        }
        
        //DEBUGGING
        console.log("Number of scene sources: " + scene.imsources.length);
        for (var a = 0; a < scene.imsources.length; a++) {
            console.log("Position of scene source " + a + " : " + vec3.str(scene.imsources[a].pos));
        }
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
    //part of the path, which will be used to compute decays in "computeInpulseResponse()"
    //Don't forget the direct path from source to receiver!
    
    //Useful function to use:
    // scene.rayIntersectFaces = function(P0, V, node, mvMatrix, excludeFace)-- computes intersections
    //of rays with all faces in the scene, taking into consideration the scene graph structure
    // This function recursively traverses the scene tree and intersects all faces. 
    // This function works with rayIntersectPolygon() to find the location of the first intersection
    // Be sure to check that an intersection with the plane spanned by the polygon is actually 
    //contained inside of the polygon. More information about the parameters is provided in the code, 
    //but see the next point for what "excludeFace" means
    
    //When you make your recursive function and are casting a ray from a particular point on the path 
    //that resulted from the ray intersecting a face, be sure to exclude the face that contains that 
    //point from the check. Otherwise, it will intersect that face at t = 0, and that face will be 
    //in front of every other face. For instance, in the image below, when casting the blue ray from 
    //the magenta point, exclude the magenta plane (line in this 2D example) from the occlusion check. 
    //You can pass along this face as the parameter excludeFace in scene.rayIntersectFaces()
    
    
    scene.extractPaths = function() {
        scene.paths = [];

        //TODO: Extract the rest of the paths by backtracing from the image sources you calculated.  
        //Return an array of arrays in scene.paths.  Recursion is highly recommended
        //Each path should start at the receiver and end at the source (or vice versa), so scene.receiver should be 
        //the first element and scene.source should be the last element of every array in scene.paths
        
        // check direct path from source to receiver
        var source = scene.source;
        var receiver = scene.receiver; 
        console.log("source: " + vec3.str(source.pos));
        console.log("receiver: " + vec3.str(receiver.pos));
        
        scene.imsources_sorted = [];
        var done = false;
        var curr_order = 0;
        while (done == false) {
            var sources_of_order = [];
            for (var i = 0; i < scene.imsources.length; i++) {
                if (scene.imsources[i].order == curr_order) {
                    sources_of_order.push(scene.imsources[i]);
                }
            }
            if (sources_of_order.length == 0) done = true;
            else {
                scene.imsources_sorted.push(sources_of_order);
                curr_order++
            }
        }
    }

    //Inputs: Fs: Sampling rate (samples per second)
    scene.computeImpulseResponse = function(Fs) {

        var SVel = 340;//Sound travels at 340 meters/second
        //TODO: Finish this.  Be sure to scale each bounce by 1/(1+r^p),
        //where r is the length of the line segment of that bounce in meters
        //and p is some integer less than 1 (make it smaller if you want the
        //paths to attenuate less and to be more echo-y as they propagate)
        //Also be sure to scale by the reflection coefficient of each material
        //bounce (you should have stored this in extractPaths() if you followed
        //those directions).  Use some form of interpolation to spread an impulse
        //which doesn't fall directly in a bin to nearby bins
        //Save the result into the array scene.impulseResp[]

    }

}

function pathsHelper(scene, initial_point, order) {
    if (order == 0) return [scene.source];
    
}

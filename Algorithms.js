//Checks to see if a ray (from P0 with direction V)  intersects the convex polygon represented by "vertices"
function rayIntersectPolygon(P0, V, vertices, mvMatrix) {
  //INPUTS:
    //P0-- initial point of a ray in WCS
    //V-- direction of a ray in WCS
    //vertices-- array of ve3 values describing the polygon vertices in its child frame (NCS)
    //mvMatric-- matric describing how to transform "vertices" from NCS to WCS
  var wc_vertices = []; // allocate an array of vec3s to hold vertices in WCS
  for (var i = 0; i < vertices.length; i++) { // for each vertex in NCS
    var wc_vertex = vec3.create(); // allocate a vector to hold transformed coordinate
    vec3.transformMat4(wc_vertex, vertices[i], mvMatrix); // transform from NCS to WCS with mvMatric
    wc_vertices.push(wc_vertex); // add transformed vertex to new array
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
  //check to see if the intersection point is inside the transformed polygon (area test)
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

  // TODO: check the special cases: intersection behind ray
}

function getTriangleArea(a, b, c) { // returns the area of a triangle defined by vertices a, b, c
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

//Recursively traverses the scene graph and adds image sources to the scene.imsources array
function sceneGraphTraversal(s, node, mvMatrix, scene){
  if ('children' in node) { // check if we need this
    for (var c = 0; c < node.children.length; c++) {//for each child in node.children
      if ('mesh' in node.children[c]){ // check if node is dummy: if not dummy node, it will have a mesh object
        var mesh = node.children[c].mesh; // access the mesh object
        for (var f = 0; f < mesh.faces.length; f++){ //loop through the array of its faces
          var face = mesh.faces[f]; // pointer to face
          if (face == s.genFace) { //if face is the face that generated the source
            continue; //Don't reflect with the face (you'll get parent image)
          }
          var vertices = face.getVerticesPos(); //get all vertices for a 'face' in NCS
          // Convert vertices from NCS to WCS:
          var nextmvMatrix = mat4.create(); //Allocate transformation matrix
          mat4.mul(nextmvMatrix, mvMatrix, node.children[c].transform); //Calculate transformation matrix based on hierarchy
          var wc_vertices = []; //Make a new array that will contains vertices (vec3s) in WCS
          for (var v=0; v<vertices.length; v++){
            var wc_vertex= vec3.create(); //allocate a vector for the transfromed vertex
            vec3.transformMat4(wc_vertex, vertices[v], nextmvMatrix);
            wc_vertices.push(wc_vertex);
          };
          //Create the mirror image across each face (plane): s' = s - (2(s-p) dot n )*n ; IF n is normalized
          //calculate plane normal and normalize
          var u1 = vec3.create(); //allocate a vector "u1" (vertex 1 to vertex 2)
          var u2 = vec3.create(); //allocate a vector "u2" (vertex 1 to vertex 3)
          vec3.subtract(u1, wc_vertices[1], wc_vertices[0]); //calculate the vector
          vec3.subtract(u2, wc_vertices[2], wc_vertices[0]); //calculate the vector
          var norm = vec3.create(); //allocate a vector for the plane normal
          vec3.cross(norm, u1, u2); //calculate plane normal using cross product
          var n = vec3.create();
          vec3.normalize(n, norm); // normalize n
          var p = wc_vertices[0]; // point p on the plane; arbitrarily a vertex
          var vecPS = vec3.create();
          vec3.subtract(vecPS, s.pos, p); // (s-p)
          var dp = 2*vec3.dot(vecPS, n); // (2(s-p) dot n )
          var dpn = vec3.create();
          vec3.scale(dpn, n, dp); //(2(s-p) dot n )*n
          var src = vec3.create(); // s'
          vec3.subtract(src, s.pos, dpn);
          // create image source and fill in fields apropriately
          var imgSrc = {pos:src, order: (s.order + 1), parent:s, genFace:face, rcoeff:s.rcoeff};
          scene.imsources.push(imgSrc); // add source to scene.imsources array
        }
      }
      else{ // node is dummy (no mesh object) -- update transformation matrix
        var nextmvMatrix = mat4.create(); //Allocate transformation matrix
        mat4.mul(nextmvMatrix, mvMatrix, node.children[c].transform); // update transformation matrix
      }
      sceneGraphTraversal(s, node.children[c], nextmvMatrix, scene); // recursive call on child
    }
  }
}

function addImageSourcesFunctions(scene) {

 //Computes intersection of ray with all faces in scene
  scene.rayIntersectFaces = function(P0, V, node, mvMatrix, excludeFace) {
    // Note: call with node=scene and mvMatrix = identity matrix to start recursion at top of the scene tree in WCS
    // INPUTS:
    // P0 (vec3): ray starting point
    // V (vec3): ray direction
    //node (object): node in scene tree to process,
    //mvMatrix (mat4): Matrix to put geometry in this node into world coordinates
    //excludeFace: pointer to face object to be excluded from intersection calculations
    // OUTPUT:
    // null if no intersection OR
    // {tmin:minimum t along ray, PMin(vec3): corresponding point, faceMin:Pointer to mesh face hit first}
    var tmin = Infinity;
    var PMin = null;
    var faceMin = null;
    var rcoeff = -1;
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
          rcoeff = node.rcoeff;
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
          rcoeff = cres.rcoeff;
        }
      }
    }
    if (PMin === null) {
      return null;
    }
    return {tmin:tmin, PMin:PMin, faceMin:faceMin, rcoeff:rcoeff};
  }

//Computes array of image sources reflected across the scene up to the specified order
  scene.computeImageSources = function(order) {
    //INPUTS: order (int): max number of bounces to take
    //Note: source objects have fields 'pos', 'genFace', 'rcoeff', 'order', and 'parent'
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
    // console.log("Number of scene sources: " + scene.imsources.length);
    //for (var a = 0; a < scene.imsources.length; a++) {
    // console.log("Position of scene source " + a + " : " + vec3.str(scene.imsources[a].pos));
    // }
  }

//Detects and stores non-obstructed paths from receiver to source
  scene.extractPaths = function() {
    scene.paths = [];
    //elements are arrays of objects describing vertices along the path
    //each element-array starts with the receiver and ends with the source
    //each object in the array contains a field 'pos' and element 'rcoeff'

    // check direct path from source to receiver
    var p0 = scene.receiver.pos;
    var v = vec3.create();
    vec3.subtract(v, scene.source.pos, p0); // ray from receiver to source --> source - receiver
    var normV = vec3.create();
    vec3.normalize(normV, v); //normalize v to get direction of the ray
    checkIntersect = scene.rayIntersectFaces(p0, normV, scene, mat4.create(), null); //check for occlusions
    if (checkIntersect == null){ // no intersections found, add the path
      scene.paths.push([scene.receiver, scene.source]);
    }
    else{ // the path is blocked by a plane
      //check if intersection point is BEHIND the source using distance between IP and Receiver & Source and Receiver
      if (vec3.distance(scene.receiver.pos, checkIntersect.PMin ) > vec3.distance(scene.receiver.pos, scene.source.pos)){
        scene.paths.push([scene.receiver, scene.source]); //direct path not blocked-- add it to the path array
      }
    }

  for(var s=1; s<scene.imsources.length; s++){ // check path from receiver to every image source (not including direct path)
    var image = scene.imsources[s];
    var arrayVert = [];
    arrayVert.push(scene.receiver);
    scenePathFinder(scene, scene.receiver.pos, image, arrayVert, null);
  }
  //TODO: optionally handle if a source and/or receiver is located on a plane
}

//Recursive helper function for extracting paths
//Traces back all paths and adds them to the path array if not blocked by elements of the scene
function scenePathFinder(scene, receiverPos, source, arrayVert, excludeFace){
  var v = vec3.create();
  vec3.subtract(v, source.pos, receiverPos); // ray from receiver to image source --> image source - receiver
  var normV = vec3.create();
  vec3.normalize(normV, v); //normalize v to get direction of the ray
  cInter = scene.rayIntersectFaces(receiverPos, normV, scene, mat4.create(), excludeFace); //check for occlusions
  if (source == scene.source){
    if(cInter == null){
      arrayVert.push(scene.source);
      scene.paths.push(arrayVert);
      return;
    }
    else{
      if ( vec3.distance(receiverPos, cInter.PMin ) > vec3.distance(receiverPos, source.pos)    ){
        //if distance between intersection point and receiver is greater than distance between receiver and soure, then intersec point is behind source
       arrayVert.push(scene.source);
        scene.paths.push(arrayVert);
      }
    }
  }
  if(cInter != null){
    if(cInter.faceMin == source.genFace && ( vec3.distance(receiverPos, cInter.PMin ) < vec3.distance(receiverPos, source.pos)  ) ){
      var pathNode = {pos:cInter.PMin, rcoeff:cInter.rcoeff};
      arrayVert.push(pathNode);
          scenePathFinder(scene, cInter.PMin, source.parent,  arrayVert, cInter.faceMin);
    }
  }
}


//Inputs: Fs: Sampling rate (samples per second)
scene.computeImpulseResponse = function(Fs) {

  var SVel = 340;//Sound travels at 340 meters/second
  var p = 0.5;
  //TODO: Finish this.  Be sure to scale each bounce by 1/(1+r^p),
  //where r is the length of the line segment of that bounce in meters
  //and p is some integer less than 1 (make it smaller if you want the
  //paths to attenuate less and to be more echo-y as they propagate)
  //Also be sure to scale by the reflection coefficient of each material
  //bounce (you should have stored this in extractPaths() if you followed
  //those directions).  Use some form of interpolation to spread an impulse
  //which doesn't fall directly in a bin to nearby bins
  //Save the result into the array scene.impulseResp[]
  var sampleIndices = [];
  var magnitudes = [];
  if (scene.paths.length == 0) {
      scene.impulseResp = [];
      return;
  }
  for (var i = 0; i < scene.paths.length; i++) {
      var path = scene.paths[i];
      var length = 0;
      var magnitude = 1.0;
      for (var j = 0; j < path.length-1; j++) {
          var r = vec3.distance(path[j].pos, path[j+1].pos);
          length += r;
          magnitude *= path[j+1].rcoeff / Math.pow(1+r, p);
      }
      var sampleIndex = Math.round(length / SVel * Fs);
      sampleIndices.push(sampleIndex);
      magnitudes.push(magnitude);
  }

  var N = 0;
  for (var i = 0; i < sampleIndices.length; i++) {
    if (sampleIndices[i] > N) {
        N = sampleIndices[i];
    }
  }
  scene.impulseResp = new Float32Array(N+1);
  for (var i = 0; i < sampleIndices.length; i++) {
      scene.impulseResp[sampleIndices[i]] += magnitudes[i];
  }

}

}

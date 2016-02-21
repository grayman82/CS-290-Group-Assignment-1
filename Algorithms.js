//var sourceImageArray;


function rayIntersectPolygon(P0, V, vertices, mvMatrix) {

  return {t:1e9, P:vec3.fromValues(0, 0, 0)};
}




function sceneGraphTraversal(s, node, mvMatrix, scene){ //complete the recursive scene graph traversal
  if ('children' in node) {

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

          var u1 = vec3.create(); //allocate a vector "u1" (vertex 1 to vertex 2)
          var u2 = vec3.create(); //allocate a vector "u2" (vertex 1 to vertex 3)
          vec3.subtract(u1, wc_vertices[1], wc_vertices[0]); //calculate the vector
          vec3.subtract(u2, wc_vertices[2], wc_vertices[0]); //calculate the vector
          var norm = vec3.create(); //allocate a vector for the plane normal
          vec3.cross(norm, u1, u2); //calculate plane normal using cross product
          //var p = vec3.create();
          //**ISSUE IS HERE: need to calculate p correctly with vec3 functions >:(
          //p = source - 2*((source-q)*norm)*norm; //The mirror image of s, snew =  s - 2((s-q)*n)*n

          var p = vec3.create();
          var spos = vec3.create();
          var s1 = vec3.create();
          var src = vec3.create();
          var tempVec = vec3.create();
          var out = vec3.create();
          p = wc_vertices[0];    // Use vertices to find a point 'p' on the plane
          spos = s.pos;
          vec3.subtract(out, spos, p); // Create a vector from the source to this point (vec=source-q)
          vec3.scale(out, out, 2);
          var tempNum = vec3.dot(out, norm);

          vec3.scale(tempVec,tempNum, norm);
          vec3.subtract(src,spos, tempVec);  // The mirror image of s, snew =  s - 2((s-q)*n)*n

          var imgSrc = {pos:src, order: (s.order + 1), parent:s, genFace:face, rcoeff:s.rcoeff};
          scene.imsources.push(imgSrc);


          //sourceImageArray.push(imgSrc); // add snew to scene.imsources[]
          ////  scene.imsources.push(snew);
        }
      }
      sceneGraphTraversal(s, node.children[c], nextmvMatrix, scene); // recursive call on child
    }
  }

}


function addImageSourcesFunctions(scene) {

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




  scene.computeImageSources = function(order) {

    scene.source.order = 0;
    scene.source.rcoeff = 1.0;
    scene.source.parent = null;
    scene.source.genFace = null;
    //sourceImageArray=[scene.source];
    //scene.imsources = sourceImageArray;
    scene.imsources= [scene.source];



    for (var o = 1; o<=order; o++){
      for (var s=0; s<scene.imsources.length; s++){ //check all previous image sources in scene.imsources
        if (scene.imsources[s].order === (o-1)){ //reflect image sources with 1 order less than the current order
          //reflect image by calling recursive scene tree function
          sceneGraphTraversal (scene.imsources[s], scene, mat4.create(), scene); //Start off recursion with scene and identity matrix
        }
      }
    }

    //DEBUGGING
    console.log("Number of scene sources: " + scene.imsources.length);

    for (var a = 0; a < scene.imsources.length; a++) {

      console.log("Position of scene source " +a + " : " + scene.imsources[a].pos);

    }


  }



  scene.extractPaths = function() {

    scene.paths = [];


  }


  scene.computeImpulseResponse = function(Fs) {

    var SVel = 340;

  }

}

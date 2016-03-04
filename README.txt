Group Assignment 1


Sanmi Oyenuga (ojo), Clemence Lapeyre, Gray Williams

#############################################################################

Image Source Generation:
Files/Methods: Algorithms.js ->

scene.computeImageSources (order):
The initial order is declared as 0. This function pushes the source as the initial
element to the scene.imsources array. It loops from an order of 1, to the order passed in.
For every order we loop through all current image sources and call sceneGraphTraversal
on all image sources exactly one order less than the current order.

sceneGraphTraversal():
For this we utilized a recursive function sceneGraphTraversal() which looped
through all elements in a node and converted the vertex positions to world
coordinates. This function then created a mirror image of the source passed into it,
reflected across all faces in the scene using the formula stipulated on the
course website. These mirror image sources are then stored along with the order
of reflection in scene file and the function continues to traverse recursively.

#############################################################################

Path Extraction:
Files: Algorithms.js

scene.extractPaths:
This loops through all image sources generated and stored scene.imsources. It
checks for the direct path between source and receiver. It then calls a scenePathFinder
function which attempts to find all paths from the receiver to all the image sources.

scenePathFinder:
This recursively takes in the receiver and source positions as well as a path (array
for all vertices) up to that point and tries find any point between r and s.
 It calls rayIntersectFaces to find the closest intersection point. If we
 have the original source and no intersection we add the path. If there is intersection
 check if it occurs behind the source. If it does add the point. If our Source
 isnt the original image source, check to make sure the point of intersection
 is between the source and receiver, and also lies on the face the image source is
 generated from. Then recurse to the parent of that source.

scene.rayIntersectFaces:
This function takes in a ray and node and matrix and recursively finds the closest
intersection point between a ray and all surface elements within the node and
 its children. This utilizes the rayIntersectPolygon method that returns the
 intersection between a face and ray. rayIntersectFaces keeps track of the tmin,
parameter i.e. the closest intersection. This minimum value is then returned.

#############################################################################
Impulse Response:
Files: Algorithms.js

scene.computeImpulseResponse:
For this function I looped through scene.paths and determined both the sample index of 
the path and the path's corresponding magnitude by computing the length of each path and 
using the path's segment lengths and reflection coefficients to scale the path's magnitude.
I then stored the magnitudes in an array scene.impulseResp, in which the index of each magnitude is
its corresponding sample index.

#############################################################################
Binaural Sound:
Files: AlgorithmsBinaural.js, SceneFileBinaural.js, SoundToolsBinaural.js

This was pretty simple to implement. First, I looked up the average distance between ears of a human head,
which is approximately 21.5 cm. Then I extracted paths for receivers that were a distance of earWidth to the left and right
of the receiver. Next, I computed the impulse responses for each ear by separating scene.paths by the left
and right paths and storing the magnitudes in two separate lists.. Finally, I edited SceneFile.js and SoundTools.js 
according to the specifications on Piazza.

#############################################################################
Near Versus Far:
Files: SampleSceneFar.scn, SampleSceneNear.scn.

For this I generated a SampleSceneNear.scn scene with four boxes placed in a small room.
For the SampleSceneFar.scn, I generated a larger room (size of a city) placed larger
boxes (building sized) around this room. In checking the impulse response/audio
played back I observed that I could hear distinct echoes in the larger room while
in the smaller room the sounds seemed to occur instantaneously.

#############################################################################
Sound Transmission:
Files: AlgorithmsTrans.js

rayIntersectFaces:
For this function I changed rayIntersectFaces to not only return a single intersection
point but an array of intersection points along the path of the ray which have a
tcoeff value (varying from 0 to 1). If there is not tcoeff in for a certain mesh,
the array has length 1 with the basic intersection point. In finding these points,
a t value is generated representing the parameter for the ray from receiver to intersection point
of face of interested (face image source was generated from). I then only stored intersection
points along this ray which had a t value less than this t. This ensures all
intersection points happen before the plane of interest. rayIntersectFaces proceeds
 recursively for all functions. The concacted array of intersection points is then
 sorted in order of increasing t, with the intersection point to the face of interest
 being the last element in the array.

 scenePathFinder:
 This was also changed. It now checks all intersection points along the path
 to make sure everyone allows transmission. If we hit a source and there is
 no intersection point, then we add the path. If there is/are, we check to make
 sure we allow transmission for all points before the source. If that is true,
 we add the path, else we end the recursion.In other cases without a source if
 we hit a face that is not at the end of the results array (point for reflection)
 then we end the recursion. If all intersection points allow transmission, we add all
points to the path, and recurse using the last intersection point (point with face of interest).


Correct:

 The algorithm is currently working in the case when there are no t coefficients
 or the t coefficient values are set to 1 AND the source is outside the box.

Known Bugs:
Bugs/Incorrect:
1) When there is no transmission, and I have the source inside the box,
for some reason the higher order reflections (greater than 0) are being transmitted
 outside the box to the receiver. It is similar to the edge case I originally
 identified but my length checks aren't catching these cases.

2) T Coefficients: When I turn on the t coefficients for any surface/box,
transmission occurs, but only transmission in this case. i.e. the box/surface
becomes transparent of sorts and I observe no reflections.

2a) When I make only the box transmit, reflections occur from the ceilings to
the source and through the box, but no ray is transmitted into the box and is
 then reflected from the internal walls of the box.

2b) when I make all the components transmit, I only get the direct path
with no transmission whatsoever.

#############################################################################
Simplified Meshes:
Files: MeshSimplification.scn, /meshes/m319.off, /meshes/m319ref.off,
 /meshes/m319ref2.off

 For this task, I downloaded MeshLab online, as well as a mesh for a human face
 (m319.off) from the Princeton database. I then applied Quadric Edge Collapse Decimation
 (factor of 0.1) to the mesh and saved the .off file (m319ref.off). I further
 simplified the mesh by another factor to make a more triangular mesh. All three
 meshes are in MeshSimplification scene file.

#############################################################################
GUI Augmentation:
Files: SceneFile.js, index.html

Varying Ray Energy Color Mapping:

SceneFile.js:
For this I first reversed how the lines were being drawn (reversed the for loop),
to trace paths from source to receiver. I then kept track of the energy coefficient,
value up to a certain point in a path (multiplying rcoeffs and tcoeffs).
I have a myColor variable defined that communicates with the front end and checks,
if the user wants to have fading colors or a solid red line. Depending on this value,
we either have colorval be 1 (red) or be a multiplication of all coefficients.
 I then drew the lines between path nodes with the color of the lines based on
the energy loss based on reflection (or transmission). In the case where myColor
is true, The color starts as a solid red line and goes to black as we lose more
and more energy with black representing 0 energy.

index.hmtl:
I added a button in the index.html as well as all the back end necessary which
allows the user toggle this varying color function. When toggled off all rays
are represented as solid red lines irrespective of transmission or reflection
, but when on, the red fades with every reflection or transmission.

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

scene.rayIntersectFaces:
This function takes in a ray and node and matrix and recursively finds the closest
intersection point between a ray and all elements within the node and its children.

#############################################################################
Near Versus Far:
Files:

#############################################################################
Sound Transmission:
Files:

#############################################################################
Simplified Meshes:
Files:

#############################################################################
GUI Augmentation:
Files:

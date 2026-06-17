/*
 *  Filename: data.js
 *  Description: Data (file references) to texture urls for the cylindrical display preview.
 *
 *  Version: 2026.06
 *  Author: Nico Reski
 *  GitHub: https://github.com/nicoversity
 */

// array containing objects with references to all (image or video) texture files for preview in the cylindrical display
// note: ideally, texture files are in a resolution and/or aspect ratio that are in line with the cylindrical display configuration (see CylindricalDisplayConfig in config.js)
// how to determine aspect ratio based on radius (r) and height (h) in CylindricalDisplayConfig:
// * step 1. determine cylindrical display circumference (c) = 2 * PI * r
// * step 2. determine aspect ratio (ar:1) = c / h
const CylindricalDisplayData = [
    {
        // test/referece image, dividing the cylindrical 360 space into eight equally sized sections; Nico Reski
        textureUrl: "./public/cd_360_eighths-color-12288x1200px.png",
        isVideo: false
    },
    {
        // 3D scene rendered with equirectangular projection (cylindrical equidistant projection); created using Unity; Nico Reski
        textureUrl: "./public/unity_3d_test-4096x400px.png",
        isVideo: false
    },
    {
        // test video, dividing the cylindrical 360 space into eight equally sized sections, each with a bouncing ball animation; Nico Reski
        textureUrl: "./public/cd_360_eighths-bouncing_balls-6144x600px.mp4",
        isVideo: true
    }
];

export { CylindricalDisplayData as CDData };
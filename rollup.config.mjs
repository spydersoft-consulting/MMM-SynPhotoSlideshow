import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import scss from 'rollup-plugin-scss'

export default [
    {
        input: './src/MMM-SynPhotoSlideshow.ts',
        plugins: [
            typescript(),
            resolve(),
            commonjs(),
            scss({
                fileName: 'SynPhotoSlideshow.css'
            })
        ],
        output: {
            file: './MMM-SynPhotoSlideshow.js',
            format: 'iife',
        },
    }, {
        input: './src/node_helper.ts',
        plugins: [
            typescript()
        ],
        output: {
            file: './node_helper.js',
            format: 'umd',
        },
    },
]

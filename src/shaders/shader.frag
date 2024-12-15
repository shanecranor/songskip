void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    fragColor = vec4(0.0);

    int numRects = 38;
    float t = iTime;
    for (int i = -10; i < numRects+10; i++) {
        float f_i = float(i);
        float f_nr = float(numRects);
        float p = f_i / f_nr;

        float rectWidth = 0.05;// + (1.0+sin(p*10.0+t/1.3))/8.0;
        float rectHeight = 0.3;
        float centerX = p;
        float centerY = sin(p * 6.0 + t) * 0.2 + 0.5;
        float angle = (iTime * 0.8) + (p * 3.0 * sin(t*0.1));
        
        vec2 rotatedUV = uv - vec2(centerX, centerY);
        rotatedUV = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * rotatedUV;
        rotatedUV += vec2(centerX, centerY);

        float rect = step(centerX - rectWidth / 2.0, rotatedUV.x) - step(centerX + rectWidth / 2.0, rotatedUV.x);
        rect *= step(centerY - rectHeight / 2.0, rotatedUV.y) - step(centerY + rectHeight / 2.0, rotatedUV.y);

        float gradient = smoothstep(centerY - rectHeight / 2.0, centerY + rectHeight / 2.0, rotatedUV.y);
        vec3 rectColor;
        vec3 black = vec3(0.0);//vec3(28.0/255.0, 4.0/255.0, 3.0/255.0);
        vec3 red = vec3(228.0/255.0, 60.0/255.0, 37.0/255.0);
        vec3 pink = vec3(233.0/255.0, 54.0/255.0, 200.0/255.0);
        vec3 white = vec3(236.0/255.0, 157.0/255.0, 205.0/255.0);
        if (gradient < 0.333) {
            rectColor = mix(black, red, (gradient * 3.0));
        } else if (gradient < 0.666) {
            rectColor = mix(red, pink, (gradient - 0.333) * 3.0);
        } else {
            rectColor = mix(pink, white, (gradient - 0.666) * 3.0);
        }

        float alpha = 1.0 - gradient * 0.0; //no transparency

        fragColor = mix(fragColor, vec4(rectColor, alpha) * rect, alpha * rect);
    }
}
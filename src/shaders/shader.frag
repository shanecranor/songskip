float tri(float x) {
    return abs(mod(x * 0.5, 1.0) - 0.5) * 4.0 - 1.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    fragColor = vec4(0.0);

    int numRects = 20;
    float t = iTime/2.0;

    float xOffsetScale = 0.1;
    float yOffsetScale = 0.05;


    for (int i = -3; i < numRects+3; i++) {
        float f_i = float(i);
        float f_nr = float(numRects);
        float p = (f_i / f_nr);
        float p2 = p*abs(p);
        
        float gradientAngle = 1.8 + p*2.0;
        float scale = 1.0 + p*p*p*3.0;
        float rectWidth = 0.04 * scale;
        float rectHeight = 0.15 *scale;
        float k = p + 0.2;
        float centerX = 1.0-p2;
        float centerY = sin( 5.0 *k * k * k + 3.0) * 0.1 + 0.1;
        float angle = (t * -0.8) + (p * 3.0);

        float xOffset = 0.0;//0.05;
        float yOffset = 0.0;

        vec2 rotationCenter = vec2(centerX + xOffset, centerY + yOffset);

        vec2 rotatedUV = uv - rotationCenter;
        rotatedUV = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * rotatedUV;
        rotatedUV += rotationCenter;

        float rect = step(centerX - rectWidth / 2.0, rotatedUV.x) - step(centerX + rectWidth / 2.0, rotatedUV.x);
        rect *= step(centerY - rectHeight / 2.0, rotatedUV.y) - step(centerY + rectHeight / 2.0, rotatedUV.y);

        // Rotate UVs for gradient calculation
        vec2 gradientUV = rotatedUV - rotationCenter;
        gradientUV = mat2(cos(gradientAngle), -sin(gradientAngle), sin(gradientAngle), cos(gradientAngle)) * gradientUV;
        gradientUV += rotationCenter;

        // Calculate gradient using the rotated UVs
        float gradient = smoothstep(centerY - rectHeight / 2.0, centerY + rectHeight / 2.0, gradientUV.y);

        vec3 rectColor;
        vec3 black = vec3(0.0);
        vec3 red = vec3(228.0 / 255.0, 60.0 / 255.0, 37.0 / 255.0);
        vec3 pink = vec3(233.0 / 255.0, 54.0 / 255.0, 200.0 / 255.0);
        vec3 white = vec3(236.0 / 255.0, 157.0 / 255.0, 205.0 / 255.0);

        if (gradient < 0.333) {
            rectColor = mix(black, red, (gradient * 3.0));
        } else if (gradient < 0.666) {
            rectColor = mix(red, pink, (gradient - 0.333) * 3.0);
        } else {
            rectColor = mix(pink, white, (gradient - 0.666) * 3.0);
        }

        float alpha = 1.0 - gradient * 0.0;

        fragColor = mix(fragColor, vec4(rectColor, alpha) * rect, alpha * rect);
    }
    numRects = 30;
    for (int i = -3; i < numRects+3; i++) {
        float f_i = float(i);
        float f_nr = float(numRects);
        float p = (f_i / f_nr);
        float p2 = p*abs(p);
        
        float gradientAngle = 1.8 + p*2.0;
        float scale = 1.0 ;
        float rectWidth = 0.02 * scale;
        float rectHeight = 0.20 *scale;
        float k = p + 0.2;
        float centerX = p;
        float centerY = sin( 4.0 * -k + 9.0 - t/2.0) * -0.1 + 0.99;
        float angle = (t * -0.8) + (p * -2.0);

        float xOffset = 0.0;//0.05;
        float yOffset = 0.0;

        vec2 rotationCenter = vec2(centerX + xOffset, centerY + yOffset);

        vec2 rotatedUV = uv - rotationCenter;
        rotatedUV = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * rotatedUV;
        rotatedUV += rotationCenter;

        float rect = step(centerX - rectWidth / 2.0, rotatedUV.x) - step(centerX + rectWidth / 2.0, rotatedUV.x);
        rect *= step(centerY - rectHeight / 2.0, rotatedUV.y) - step(centerY + rectHeight / 2.0, rotatedUV.y);

        // Rotate UVs for gradient calculation
        vec2 gradientUV = rotatedUV - rotationCenter;
        gradientUV = mat2(cos(gradientAngle), -sin(gradientAngle), sin(gradientAngle), cos(gradientAngle)) * gradientUV;
        gradientUV += rotationCenter;

        // Calculate gradient using the rotated UVs
        float gradient = smoothstep(centerY - rectHeight / 2.0, centerY + rectHeight / 2.0, gradientUV.y);

        vec3 rectColor;
        vec3 black = vec3(0.0);
        vec3 red = vec3(228.0 / 255.0, 60.0 / 255.0, 37.0 / 255.0);
        vec3 pink = vec3(233.0 / 255.0, 54.0 / 255.0, 200.0 / 255.0);
        vec3 white = vec3(236.0 / 255.0, 157.0 / 255.0, 205.0 / 255.0);

        if (gradient < 0.333) {
            rectColor = mix(black, red, (gradient * 3.0));
        } else if (gradient < 0.666) {
            rectColor = mix(red, pink, (gradient - 0.333) * 3.0);
        } else {
            rectColor = mix(pink, white, (gradient - 0.666) * 3.0);
        }

        float alpha = 1.0 - gradient * 0.0;

        fragColor = mix(fragColor, vec4(rectColor, alpha) * rect, alpha * rect);
    }
}
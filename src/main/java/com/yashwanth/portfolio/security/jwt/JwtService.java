package com.yashwanth.portfolio.security.jwt;

import com.yashwanth.portfolio.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final JwtProperties jwtProperties;
    private final Key signingKey;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtProperties.secret()));
    }

    public String generateAccessToken(UserDetails userDetails) {
        return generateToken(userDetails, jwtProperties.accessTokenExpiration(), Map.of("type", "access"));
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return generateToken(userDetails, jwtProperties.refreshTokenExpiration(), Map.of("type", "refresh"));
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public Instant extractExpiration(String token) {
        return extractClaims(token).getExpiration().toInstant();
    }

    public String extractTokenType(String token) {
        Object type = extractClaims(token).get("type");
        return type == null ? null : type.toString();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        Claims claims = extractClaims(token);
        return claims.getSubject().equals(userDetails.getUsername())
                && claims.getExpiration().after(new Date());
    }

    public boolean isTokenValid(String token, UserDetails userDetails, String expectedType) {
        return isTokenValid(token, userDetails)
                && expectedType.equalsIgnoreCase(extractTokenType(token));
    }

    public boolean isTokenParsable(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }

    private String generateToken(UserDetails userDetails, long expirationInSeconds, Map<String, Object> claims) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claims(claims)
                .subject(userDetails.getUsername())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirationInSeconds)))
                .signWith(signingKey)
                .compact();
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}

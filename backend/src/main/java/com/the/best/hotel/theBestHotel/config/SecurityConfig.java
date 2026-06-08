package com.the.best.hotel.theBestHotel.config;

import com.the.best.hotel.theBestHotel.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        .requestMatchers("/users/**").hasRole("ADMIN")
                        .requestMatchers("/employees/**").hasRole("ADMIN")

                        .requestMatchers("/bookings/*/request-checkin").hasRole("CLIENT")

                        .requestMatchers(HttpMethod.GET, "/stays/my").hasRole("CLIENT")
                        .requestMatchers("/stays/checkin").hasAnyRole("ADMIN", "EMPLOYEE")
                        .requestMatchers("/stays/*/checkout").hasAnyRole("ADMIN", "EMPLOYEE")
                        .requestMatchers("/stays/*/consumptions").hasAnyRole("ADMIN", "EMPLOYEE", "CLIENT")
                        .requestMatchers("/stays/*/consumptions/*").hasAnyRole("ADMIN", "EMPLOYEE", "CLIENT")
                        .requestMatchers("/bookings/*/cancel").hasAnyRole("ADMIN", "EMPLOYEE", "CLIENT")
                        .requestMatchers("/bookings/*/approve").hasAnyRole("ADMIN", "EMPLOYEE")

                        .requestMatchers(HttpMethod.POST, "/bookings").hasAnyRole("ADMIN", "EMPLOYEE", "CLIENT")
                        .requestMatchers(HttpMethod.DELETE, "/bookings/*").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/rooms/**").hasAnyRole("ADMIN", "EMPLOYEE", "CLIENT")
                        .requestMatchers(HttpMethod.POST, "/rooms").hasAnyRole("ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.PUT, "/rooms/*").hasAnyRole("ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.DELETE, "/rooms/*").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/products/**").hasAnyRole("ADMIN", "EMPLOYEE", "CLIENT")
                        .requestMatchers(HttpMethod.PUT, "/products/*").hasAnyRole("ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.POST, "/products").hasAnyRole("ADMIN", "EMPLOYEE")

                        .requestMatchers(HttpMethod.GET, "/**").authenticated()

                        .anyRequest().hasRole("ADMIN")
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

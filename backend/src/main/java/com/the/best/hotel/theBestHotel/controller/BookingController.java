package com.the.best.hotel.theBestHotel.controller;

import com.the.best.hotel.theBestHotel.model.Booking;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.service.BookingService;
import com.the.best.hotel.theBestHotel.service.UserService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Booking>> findAll() {
        return ResponseEntity.ok(bookingService.findAll());
    }

    @GetMapping("/my")
    public ResponseEntity<List<Booking>> findMyBookings(Authentication auth) {
        User user = userService.findByEmail(auth.getName());
        if (user.getRefId() == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(bookingService.findByClient(user.getRefId()));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Booking>> findByStatus(@PathVariable Booking.Status status) {
        return ResponseEntity.ok(bookingService.findByStatus(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Booking> findById(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.findById(new ObjectId(id)));
    }

    @PostMapping
    public ResponseEntity<Booking> create(@RequestBody Booking booking, Authentication auth) {
        User user = userService.findByEmail(auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.create(booking, user.getRole(), user.getRefId()));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Booking> approve(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.approve(new ObjectId(id)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancel(@PathVariable String id, @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "");
        return ResponseEntity.ok(bookingService.cancel(new ObjectId(id), reason));
    }

    @PostMapping("/{id}/request-checkin")
    public ResponseEntity<Booking> requestCheckin(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.requestCheckin(new ObjectId(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        bookingService.delete(new ObjectId(id));
        return ResponseEntity.noContent().build();
    }
}
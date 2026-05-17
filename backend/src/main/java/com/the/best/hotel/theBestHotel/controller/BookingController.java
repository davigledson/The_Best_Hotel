package com.the.best.hotel.theBestHotel.controller;

import com.the.best.hotel.theBestHotel.model.Booking;
import com.the.best.hotel.theBestHotel.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @GetMapping
    public ResponseEntity<List<Booking>> findAll() {
        return ResponseEntity.ok(bookingService.findAll());
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
    public ResponseEntity<Booking> create(@RequestBody Booking booking) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.create(booking));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancel(@PathVariable String id, @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "");
        return ResponseEntity.ok(bookingService.cancel(new ObjectId(id), reason));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        bookingService.delete(new ObjectId(id));
        return ResponseEntity.noContent().build();
    }
}
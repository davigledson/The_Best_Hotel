package com.the.best.hotel.theBestHotel.controller;

import com.the.best.hotel.theBestHotel.model.Stay;
import com.the.best.hotel.theBestHotel.service.StayService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stays")
@RequiredArgsConstructor
public class StayController {

    private final StayService stayService;

    @GetMapping
    public ResponseEntity<List<Stay>> findAll() {
        return ResponseEntity.ok(stayService.findAll());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Stay>> findByStatus(@PathVariable Stay.Status status) {
        return ResponseEntity.ok(stayService.findByStatus(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Stay> findById(@PathVariable String id) {
        return ResponseEntity.ok(stayService.findById(new ObjectId(id)));
    }

    @PostMapping("/checkin")
    public ResponseEntity<Stay> checkIn(@RequestBody Map<String, String> body) {
        ObjectId bookingId = new ObjectId(body.get("bookingId"));
        ObjectId employeeId = new ObjectId(body.get("employeeId"));
        return ResponseEntity.status(HttpStatus.CREATED).body(stayService.checkIn(bookingId, employeeId));
    }

    @PostMapping("/{id}/consumption")
    public ResponseEntity<Stay> addConsumption(@PathVariable String id, @RequestBody Map<String, String> body) {
        ObjectId productId = new ObjectId(body.get("productId"));
        int quantity = Integer.parseInt(body.get("quantity"));
        return ResponseEntity.ok(stayService.addConsumption(new ObjectId(id), productId, quantity));
    }

    @PostMapping("/{id}/checkout")
    public ResponseEntity<Stay> checkOut(@PathVariable String id, @RequestBody Map<String, String> body) {
        ObjectId employeeId = new ObjectId(body.get("employeeId"));
        return ResponseEntity.ok(stayService.checkOut(new ObjectId(id), employeeId));
    }
}
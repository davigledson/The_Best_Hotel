package com.the.best.hotel.theBestHotel.repository;

import com.the.best.hotel.theBestHotel.model.Product;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProductRepository extends MongoRepository<Product, ObjectId> {

    List<Product> findByActive(boolean active);

    List<Product> findByCategory(String category);
}